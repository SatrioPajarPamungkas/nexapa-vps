import { NextResponse } from 'next/server';

import {
  ForbiddenError,
  UnauthorizedError,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import {
  EmbeddedSignupError,
  exchangeEmbeddedSignupCode,
  generateRegistrationPin,
  getEmbeddedSignupPublicSettings,
  verifyEmbeddedSignupAsset,
} from '@/lib/whatsapp/embedded-signup';
import { encrypt } from '@/lib/whatsapp/encryption';
import {
  registerPhoneNumber,
  subscribeWabaToApp,
} from '@/lib/whatsapp/meta-api';

const META_ID_PATTERN = /^\d{5,32}$/;

function embeddedSignupErrorResponse(error: unknown): NextResponse {
  if (error instanceof EmbeddedSignupError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  }
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return toErrorResponse(error);
  }
  console.error('[whatsapp/embedded-signup] unexpected error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

function normalizedOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Browser POSTs must originate from this deployment. Supabase cookies already
 * use SameSite protection; this explicit check also covers deployments that
 * later loosen their cookie policy. Proxy-aware origins keep nginx/HTTPS
 * deployments from being rejected when Next itself listens on localhost.
 */
function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return;

  const allowed = new Set<string>();
  allowed.add(new URL(request.url).origin);

  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (publicSiteUrl) {
    const siteOrigin = normalizedOrigin(publicSiteUrl);
    if (siteOrigin) allowed.add(siteOrigin);
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const forwardedOrigin = normalizedOrigin(
      `${forwardedProto}://${forwardedHost.split(',')[0].trim()}`
    );
    if (forwardedOrigin) allowed.add(forwardedOrigin);
  }

  if (!allowed.has(origin)) {
    throw new EmbeddedSignupError('Invalid request origin.', 403);
  }
}

/** Runtime SDK settings. App ID and configuration ID are public identifiers. */
export async function GET() {
  try {
    await requireRole('admin');
    return NextResponse.json(getEmbeddedSignupPublicSettings());
  } catch (error) {
    return embeddedSignupErrorResponse(error);
  }
}

/**
 * Completes Meta Embedded Signup for the caller's workspace.
 *
 * The browser only sends the one-time authorization code and the asset IDs
 * emitted by Meta. App secret use, token exchange, asset verification,
 * registration, subscription and encrypted persistence all stay server-side.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ctx = await requireRole('admin');
    const body = (await request.json()) as Record<string, unknown>;

    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const wabaId = typeof body.waba_id === 'string' ? body.waba_id.trim() : '';
    const phoneNumberId =
      typeof body.phone_number_id === 'string'
        ? body.phone_number_id.trim()
        : '';
    const suppliedRegistrationPin =
      typeof body.registration_pin === 'string'
        ? body.registration_pin.trim()
        : '';

    if (code.length < 8 || code.length > 4096) {
      throw new EmbeddedSignupError('Invalid Embedded Signup code.');
    }
    if (!META_ID_PATTERN.test(wabaId)) {
      throw new EmbeddedSignupError('Invalid WhatsApp Business Account ID.');
    }
    if (!META_ID_PATTERN.test(phoneNumberId)) {
      throw new EmbeddedSignupError('Invalid WhatsApp phone number ID.');
    }
    if (suppliedRegistrationPin && !/^\d{6}$/.test(suppliedRegistrationPin)) {
      throw new EmbeddedSignupError(
        'The WhatsApp two-step-verification PIN must contain exactly six digits.'
      );
    }

    const accessToken = await exchangeEmbeddedSignupCode(code);
    const phoneInfo = await verifyEmbeddedSignupAsset({
      wabaId,
      phoneNumberId,
      accessToken,
    });

    const { data: claimed, error: claimedError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('account_id')
      .eq('phone_number_id', phoneNumberId)
      .neq('account_id', ctx.accountId)
      .maybeSingle();

    if (claimedError) {
      console.error(
        '[whatsapp/embedded-signup] phone ownership check failed:',
        claimedError
      );
      throw new Error('Phone ownership check failed');
    }
    if (claimed) {
      throw new EmbeddedSignupError(
        'This WhatsApp phone number is already connected to another Nexapa workspace.',
        409
      );
    }

    let encryptedAccessToken: string;
    try {
      encryptedAccessToken = encrypt(accessToken);
    } catch (error) {
      console.error(
        '[whatsapp/embedded-signup] token encryption failed:',
        error
      );
      throw new EmbeddedSignupError(
        'Nexapa could not secure the Meta token. Check ENCRYPTION_KEY.',
        500
      );
    }

    const { data: existing, error: existingError } = await ctx.supabase
      .from('whatsapp_config')
      .select('id, phone_number_id, registered_at')
      .eq('account_id', ctx.accountId)
      .eq('phone_number_id', phoneNumberId)
      .maybeSingle();

    if (existingError) {
      console.error(
        '[whatsapp/embedded-signup] existing config lookup failed:',
        existingError
      );
      throw new Error('Existing config lookup failed');
    }

    try {
      await subscribeWabaToApp({ wabaId, accessToken });
    } catch (error) {
      console.error(
        '[whatsapp/embedded-signup] WABA subscription failed:',
        error
      );
      throw new EmbeddedSignupError(
        error instanceof Error
          ? `Meta could not subscribe the WhatsApp account: ${error.message}`
          : 'Meta could not subscribe the WhatsApp account.',
        502
      );
    }

    const now = new Date().toISOString();
    const sameRegisteredNumber =
      existing?.phone_number_id === phoneNumberId &&
      existing.registered_at != null;

    let registrationPin: string | null = null;
    if (!sameRegisteredNumber) {
      const pinForRegistration =
        suppliedRegistrationPin || generateRegistrationPin();
      let registration;
      try {
        registration = await registerPhoneNumber({
          phoneNumberId,
          accessToken,
          pin: pinForRegistration,
        });
      } catch (error) {
        console.error(
          '[whatsapp/embedded-signup] phone registration failed:',
          error
        );
        throw new EmbeddedSignupError(
          error instanceof Error
            ? `Meta could not register the phone number: ${error.message}`
            : 'Meta could not register the phone number.',
          502
        );
      }
      // The generated PIN is valid only when this request performed a fresh
      // registration. If Meta says the number was already registered, do not
      // show the generated value as though it controlled the existing number.
      if (!suppliedRegistrationPin && !registration.alreadyRegistered) {
        registrationPin = pinForRegistration;
      }
    }

    const row = {
      phone_number_id: phoneNumberId,
      display_phone_number: phoneInfo.display_phone_number ?? null,
      waba_id: wabaId,
      access_token: encryptedAccessToken,
      // One global server-side verify token protects the shared webhook.
      // Customers never create or paste webhook tokens.
      verify_token: null,
      status: 'connected',
      connected_at: now,
      registered_at: sameRegisteredNumber ? existing.registered_at : now,
      subscribed_apps_at: now,
      last_registration_error: null,
      updated_at: now,
    };

    let savedConnectionId = existing?.id ?? null;

    if (existing) {
      const { error } = await ctx.supabase
        .from('whatsapp_config')
        .update(row)
        .eq('account_id', ctx.accountId)
        .eq('id', existing.id);
      if (error) {
        console.error(
          '[whatsapp/embedded-signup] config update failed:',
          error
        );
        throw new Error('Config update failed');
      }
    } else {
      const { data: inserted, error } = await ctx.supabase
        .from('whatsapp_config')
        .insert({
          ...row,
          account_id: ctx.accountId,
          user_id: ctx.userId,
          is_active: false,
        })
        .select('id')
        .single();
      if (error) {
        console.error(
          '[whatsapp/embedded-signup] config insert failed:',
          error
        );
        throw new Error('Config insert failed');
      }
      savedConnectionId = inserted.id;
    }

    const { error: activateError } = await ctx.supabase.rpc(
      'activate_whatsapp_connection',
      { connection_id: savedConnectionId },
    );
    if (activateError) throw new Error('Config activation failed');

    return NextResponse.json({
      success: true,
      phone_info: phoneInfo,
      registration_pin: registrationPin,
    });
  } catch (error) {
    return embeddedSignupErrorResponse(error);
  }
}
