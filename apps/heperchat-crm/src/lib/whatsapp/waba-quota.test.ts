import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/lib/flows/admin-client', () => ({
  supabaseAdmin: () => ({
    rpc: mocks.rpc,
  }),
}));

import {
  reserveWabaConnection,
  WabaQuotaError,
} from './waba-quota';

const validEntitlement = {
  allowed: true,
  whatsapp_enabled: true,
  waba_limit: 3,
  waba_replacement_limit: 3,
  waba_replacement_period: {
    starts_at: '2026-09-01T00:00:00.000Z',
    ends_at: '2026-10-01T00:00:00.000Z',
  },
};

const reservation = {
  reservation_id:
    '16fa2d76-74ac-4aca-adaf-847401718d88',
  classification: 'initial',
  waba_limit: 3,
  active_wabas: 1,
  replacement_limit: 3,
  replacements_used: 0,
  period_ends_at: '2026-10-01T00:00:00.000Z',
};

function jsonResponse(
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function reserve() {
  return reserveWabaConnection({
    crmUserId:
      '238ca266-42ea-44f8-9a33-61e063264c9c',
    accountId:
      '895e3c59-283f-41ea-9cf8-2dc34928005e',
    wabaId: '123456789012345',
  });
}

describe('reserveWabaConnection', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();

    vi.stubEnv(
      'NEXAPA_API_INTERNAL_URL',
      'https://api.internal.test/'
    );
    vi.stubEnv(
      'NEXAPA_ENTITLEMENT_KEY',
      'test-entitlement-key'
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('uses trusted entitlement values for the RPC', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(validEntitlement)
      );

    vi.stubGlobal('fetch', fetchMock);

    mocks.rpc.mockResolvedValue({
      data: reservation,
      error: null,
    });

    await expect(reserve()).resolves.toEqual(
      reservation
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.internal.test/api/internal/crm-entitlement' +
        '?crm_user_id=238ca266-42ea-44f8-9a33-61e063264c9c',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'X-Nexapa-Entitlement-Key':
            'test-entitlement-key',
        },
      })
    );

    expect(mocks.rpc).toHaveBeenCalledWith(
      'reserve_waba_connection',
      {
        p_account_id:
          '895e3c59-283f-41ea-9cf8-2dc34928005e',
        p_waba_id: '123456789012345',
        p_waba_limit: 3,
        p_replacement_limit: 3,
        p_period_starts_at:
          '2026-09-01T00:00:00.000Z',
        p_period_ends_at:
          '2026-10-01T00:00:00.000Z',
      }
    );
  });

  it('rejects a package without WhatsApp access', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          allowed: true,
          whatsapp_enabled: false,
          code: 'whatsapp_not_in_package',
        })
      )
    );

    await expect(reserve()).rejects.toMatchObject({
      name: 'WabaQuotaError',
      status: 403,
      code: 'whatsapp_not_in_package',
    });

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects an incomplete entitlement response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          allowed: true,
          whatsapp_enabled: true,
          waba_limit: 3,
        })
      )
    );

    await expect(reserve()).rejects.toMatchObject({
      status: 503,
      code: 'waba_entitlement_invalid',
    });

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('maps the active WABA limit error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(validEntitlement)
      )
    );

    mocks.rpc.mockResolvedValue({
      data: null,
      error: {
        message: 'WABA_ACTIVE_LIMIT_REACHED:3',
      },
    });

    await expect(reserve()).rejects.toMatchObject({
      status: 409,
      code: 'waba_active_limit_reached',
    });
  });

  it('maps the fourth replacement rejection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(validEntitlement)
      )
    );

    mocks.rpc.mockResolvedValue({
      data: null,
      error: {
        message:
          'WABA_REPLACEMENT_LIMIT_REACHED:3:2026-10-01',
      },
    });

    const error = await reserve().catch(
      (caught: unknown) => caught
    );

    expect(error).toBeInstanceOf(WabaQuotaError);
    expect(error).toMatchObject({
      status: 409,
      code: 'waba_replacement_limit_reached',
    });
  });

  it('fails closed when entitlement is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(
        new Error('network unavailable')
      )
    );

    await expect(reserve()).rejects.toMatchObject({
      status: 503,
      code: 'waba_entitlement_unavailable',
    });

    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
