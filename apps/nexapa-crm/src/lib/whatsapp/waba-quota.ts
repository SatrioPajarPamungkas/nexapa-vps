import { supabaseAdmin } from '@/lib/flows/admin-client';

type EntitlementResponse = {
  allowed?: boolean;
  whatsapp_enabled?: boolean;
  waba_limit?: number;
  waba_replacement_limit?: number;
  waba_replacement_period?: {
    starts_at?: string;
    ends_at?: string;
  };
  code?: string;
};

type ReservationPayload = {
  reservation_id: string;
  classification: string;
  waba_limit: number;
  active_wabas: number;
  replacement_limit: number;
  replacements_used: number;
  period_ends_at: string;
};

export class WabaQuotaError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WabaQuotaError';
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new WabaQuotaError(
      'WABA quota verification is temporarily unavailable.',
      503,
      'waba_entitlement_unavailable'
    );
  }

  return value;
}

function validDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

async function fetchEntitlement(
  crmUserId: string
): Promise<EntitlementResponse> {
  const apiUrl = requiredEnvironment(
    'NEXAPA_API_INTERNAL_URL'
  ).replace(/\/+$/, '');

  const entitlementKey = requiredEnvironment(
    'NEXAPA_ENTITLEMENT_KEY'
  );

  let response: Response;

  try {
    response = await fetch(
      `${apiUrl}/api/internal/crm-entitlement` +
        `?crm_user_id=${encodeURIComponent(crmUserId)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Nexapa-Entitlement-Key': entitlementKey,
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      }
    );
  } catch {
    throw new WabaQuotaError(
      'WABA quota verification is temporarily unavailable.',
      503,
      'waba_entitlement_unavailable'
    );
  }

  if (!response.ok) {
    throw new WabaQuotaError(
      'WABA quota verification is temporarily unavailable.',
      503,
      'waba_entitlement_unavailable',
      { upstream_status: response.status }
    );
  }

  return (await response.json()) as EntitlementResponse;
}

function normalizeEntitlement(
  entitlement: EntitlementResponse
) {
  if (
    entitlement.allowed !== true ||
    entitlement.whatsapp_enabled !== true
  ) {
    throw new WabaQuotaError(
      'Your current package does not include WhatsApp access.',
      403,
      entitlement.code ?? 'whatsapp_not_in_package'
    );
  }

  const wabaLimit = Number(entitlement.waba_limit);
  const replacementLimit = Number(
    entitlement.waba_replacement_limit
  );

  const periodStartsAt =
    entitlement.waba_replacement_period?.starts_at;
  const periodEndsAt =
    entitlement.waba_replacement_period?.ends_at;

  if (
    !Number.isInteger(wabaLimit) ||
    wabaLimit < 1 ||
    !Number.isInteger(replacementLimit) ||
    replacementLimit < 0 ||
    !validDate(periodStartsAt) ||
    !validDate(periodEndsAt)
  ) {
    throw new WabaQuotaError(
      'The WABA quota returned by the subscription service is invalid.',
      503,
      'waba_entitlement_invalid'
    );
  }

  return {
    wabaLimit,
    replacementLimit,
    periodStartsAt,
    periodEndsAt,
  };
}

function databaseQuotaError(
  message: string
): WabaQuotaError {
  if (message.includes('WABA_ACTIVE_LIMIT_REACHED')) {
    return new WabaQuotaError(
      'The active WABA limit for this package has been reached.',
      409,
      'waba_active_limit_reached'
    );
  }

  if (
    message.includes('WABA_REPLACEMENT_LIMIT_REACHED')
  ) {
    return new WabaQuotaError(
      'The maximum of three WABA replacements for this subscription period has been reached.',
      409,
      'waba_replacement_limit_reached'
    );
  }

  if (message.includes('WABA_NOT_INCLUDED_IN_PACKAGE')) {
    return new WabaQuotaError(
      'Your current package does not include a WABA connection.',
      403,
      'waba_not_in_package'
    );
  }

  if (
    message.includes('WABA_ID_INVALID') ||
    message.includes('WABA_PERIOD_')
  ) {
    return new WabaQuotaError(
      'The WABA quota request is invalid.',
      400,
      'waba_quota_request_invalid'
    );
  }

  return new WabaQuotaError(
    'WABA quota reservation could not be completed.',
    503,
    'waba_reservation_failed'
  );
}

export async function reserveWabaConnection(input: {
  crmUserId: string;
  accountId: string;
  wabaId: string;
}): Promise<ReservationPayload> {
  const entitlement = normalizeEntitlement(
    await fetchEntitlement(input.crmUserId)
  );

  const { data, error } = await supabaseAdmin().rpc(
    'reserve_waba_connection',
    {
      p_account_id: input.accountId,
      p_waba_id: input.wabaId,
      p_waba_limit: entitlement.wabaLimit,
      p_replacement_limit:
        entitlement.replacementLimit,
      p_period_starts_at:
        entitlement.periodStartsAt,
      p_period_ends_at: entitlement.periodEndsAt,
    }
  );

  if (error) {
    throw databaseQuotaError(error.message);
  }

  const payload = data as ReservationPayload | null;

  if (
    !payload ||
    typeof payload.reservation_id !== 'string'
  ) {
    throw new WabaQuotaError(
      'WABA quota reservation returned an invalid response.',
      503,
      'waba_reservation_invalid'
    );
  }

  return payload;
}
