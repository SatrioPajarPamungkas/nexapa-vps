import crypto from 'crypto';

const DEFAULT_GRAPH_API_VERSION = 'v26.0';
const GRAPH_API_ORIGIN = 'https://graph.facebook.com';

interface MetaErrorEnvelope {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    type?: string;
  };
}

interface TokenExchangeResponse extends MetaErrorEnvelope {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

interface WabaPhoneNumber {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
}

interface WabaPhoneNumbersResponse extends MetaErrorEnvelope {
  data?: WabaPhoneNumber[];
  paging?: { next?: string };
}

export interface EmbeddedSignupPublicSettings {
  appId: string;
  configurationId: string;
  graphApiVersion: string;
}

export interface EmbeddedSignupServerSettings extends EmbeddedSignupPublicSettings {
  appSecret: string;
}

export class EmbeddedSignupError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'EmbeddedSignupError';
    this.status = status;
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new EmbeddedSignupError(
      `Meta Embedded Signup is not configured: ${name} is missing.`,
      503
    );
  }
  return value;
}

export function getEmbeddedSignupSettings(): EmbeddedSignupServerSettings {
  const graphApiVersion =
    process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_API_VERSION;

  if (!/^v\d+\.\d+$/.test(graphApiVersion)) {
    throw new EmbeddedSignupError(
      'META_GRAPH_API_VERSION must look like v26.0.',
      503
    );
  }

  return {
    appId: requiredEnv('META_APP_ID'),
    appSecret: requiredEnv('META_APP_SECRET'),
    configurationId: requiredEnv('META_WHATSAPP_CONFIGURATION_ID'),
    graphApiVersion,
  };
}

export function getEmbeddedSignupPublicSettings(): EmbeddedSignupPublicSettings {
  const { appId, configurationId, graphApiVersion } =
    getEmbeddedSignupSettings();
  return { appId, configurationId, graphApiVersion };
}

async function readMetaError(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const payload = (await response.json()) as MetaErrorEnvelope;
    return payload.error?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function exchangeEmbeddedSignupCode(
  code: string
): Promise<string> {
  const { appId, appSecret, graphApiVersion } = getEmbeddedSignupSettings();
  const query = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code,
  });
  const response = await fetch(
    `${GRAPH_API_ORIGIN}/${graphApiVersion}/oauth/access_token?${query}`,
    { method: 'GET', cache: 'no-store' }
  );

  if (!response.ok) {
    throw new EmbeddedSignupError(
      await readMetaError(response, 'Meta rejected the Embedded Signup code.')
    );
  }

  const payload = (await response.json()) as TokenExchangeResponse;
  if (!payload.access_token) {
    throw new EmbeddedSignupError(
      'Meta did not return an access token for this signup session.'
    );
  }
  return payload.access_token;
}

/**
 * Confirms that the browser-reported phone number is actually inside the
 * browser-reported WABA and is accessible with the exchanged token. The
 * Embedded Signup postMessage payload is client-controlled input; this lookup
 * is the server-side trust boundary before we bind an asset to a workspace.
 */
export async function verifyEmbeddedSignupAsset(args: {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
}): Promise<WabaPhoneNumber> {
  const { graphApiVersion } = getEmbeddedSignupSettings();
  let url: string | undefined =
    `${GRAPH_API_ORIGIN}/${graphApiVersion}/${args.wabaId}/phone_numbers` +
    '?fields=id,display_phone_number,verified_name,quality_rating&limit=100';

  while (url) {
    const parsedUrl = new URL(url);
    if (parsedUrl.origin !== GRAPH_API_ORIGIN) {
      throw new EmbeddedSignupError(
        'Meta returned an invalid pagination URL while verifying the phone number.',
        502
      );
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${args.accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new EmbeddedSignupError(
        await readMetaError(
          response,
          'Meta could not verify the selected WhatsApp Business Account.'
        )
      );
    }

    const payload = (await response.json()) as WabaPhoneNumbersResponse;
    const phone = payload.data?.find((item) => item.id === args.phoneNumberId);
    if (phone) return phone;
    url = payload.paging?.next;
  }

  throw new EmbeddedSignupError(
    'The selected phone number does not belong to the selected WhatsApp Business Account.'
  );
}

/** Generate a six-digit two-step-verification PIN without modulo bias. */
export function generateRegistrationPin(): string {
  return crypto.randomInt(100000, 1000000).toString();
}
