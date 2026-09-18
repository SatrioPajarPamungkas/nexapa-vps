import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  exchangeEmbeddedSignupCode,
  generateRegistrationPin,
  getEmbeddedSignupPublicSettings,
  verifyEmbeddedSignupAsset,
} from './embedded-signup';

describe('Meta Embedded Signup helpers', () => {
  beforeEach(() => {
    vi.stubEnv('META_APP_ID', '1390486843051496');
    vi.stubEnv('META_APP_SECRET', 'test-app-secret');
    vi.stubEnv('META_WHATSAPP_CONFIGURATION_ID', '1601599971312327');
    vi.stubEnv('META_GRAPH_API_VERSION', 'v26.0');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('only exposes public SDK settings', () => {
    expect(getEmbeddedSignupPublicSettings()).toEqual({
      appId: '1390486843051496',
      configurationId: '1601599971312327',
      graphApiVersion: 'v26.0',
    });
  });

  it('exchanges a one-time code without returning the app secret', async () => {
    let requestedUrl = '';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        requestedUrl = url;
        return Response.json({ access_token: 'system-user-token' });
      })
    );

    await expect(exchangeEmbeddedSignupCode('one-time-code')).resolves.toBe(
      'system-user-token'
    );
    expect(requestedUrl).toContain('/v26.0/oauth/access_token?');
    expect(requestedUrl).toContain('client_id=1390486843051496');
    expect(requestedUrl).toContain('client_secret=test-app-secret');
    expect(requestedUrl).toContain('code=one-time-code');
  });

  it('rejects a phone number that is not in the selected WABA', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ data: [{ id: 'different-phone' }] }))
    );

    await expect(
      verifyEmbeddedSignupAsset({
        wabaId: '27097971653230421',
        phoneNumberId: '1159360973925825',
        accessToken: 'system-user-token',
      })
    ).rejects.toThrow(/does not belong/);
  });

  it('rejects an untrusted pagination URL returned by Meta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          data: [],
          paging: { next: 'https://attacker.example/steal-token' },
        })
      )
    );

    await expect(
      verifyEmbeddedSignupAsset({
        wabaId: '27097971653230421',
        phoneNumberId: '1159360973925825',
        accessToken: 'system-user-token',
      })
    ).rejects.toThrow(/invalid pagination URL/);
  });

  it('returns verified phone metadata from the WABA', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          data: [
            {
              id: '1159360973925825',
              display_phone_number: '+62 812-3456-7890',
              verified_name: 'Nexapa',
            },
          ],
        })
      )
    );

    await expect(
      verifyEmbeddedSignupAsset({
        wabaId: '27097971653230421',
        phoneNumberId: '1159360973925825',
        accessToken: 'system-user-token',
      })
    ).resolves.toMatchObject({
      id: '1159360973925825',
      verified_name: 'Nexapa',
    });
  });

  it('generates a six-digit registration PIN', () => {
    expect(generateRegistrationPin()).toMatch(/^\d{6}$/);
  });
});
