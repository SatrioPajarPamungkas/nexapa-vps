'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-can';

interface EmbeddedSignupSettings {
  appId: string;
  configurationId: string;
  graphApiVersion: string;
}

interface EmbeddedSignupSession {
  wabaId: string;
  phoneNumberId?: string;
}

interface FacebookLoginResponse {
  authResponse?: { code?: string };
  status?: string;
}

interface FacebookSdk {
  init(options: {
    appId: string;
    cookie: boolean;
    xfbml: boolean;
    version: string;
  }): void;
  login(
    callback: (response: FacebookLoginResponse) => void,
    options: Record<string, unknown>
  ): void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
  }
}

type SessionWaiter = {
  resolve: (session: EmbeddedSignupSession) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const FACEBOOK_SDK_ID = 'facebook-jssdk';
const FACEBOOK_MESSAGE_ORIGINS = new Set([
  'https://www.facebook.com',
  'https://web.facebook.com',
]);

let sdkLoadPromise: Promise<FacebookSdk> | null = null;

function loadFacebookSdk(): Promise<FacebookSdk> {
  if (window.FB) return Promise.resolve(window.FB);
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<FacebookSdk>((resolve, reject) => {
    const finish = () => {
      if (window.FB) resolve(window.FB);
      else reject(new Error('Meta SDK loaded without exposing FB.'));
    };

    const existing = document.getElementById(
      FACEBOOK_SDK_ID
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Could not load the Meta SDK.')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.id = FACEBOOK_SDK_ID;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.addEventListener('load', finish, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Could not load the Meta SDK.')),
      { once: true }
    );
    document.head.appendChild(script);
  }).catch((error) => {
    sdkLoadPromise = null;
    throw error;
  });

  return sdkLoadPromise;
}

function parseEmbeddedSignupMessage(
  value: unknown
): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

export function MetaEmbeddedSignup({
  onConnected,
}: {
  onConnected: () => Promise<void> | void;
}) {
  const { profileLoading } = useAuth();
  const canEditSettings = useCan('edit-settings');
  const [settings, setSettings] = useState<EmbeddedSignupSettings | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [subscriptionRequired, setSubscriptionRequired] =
    useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [registrationPin, setRegistrationPin] = useState<string | null>(null);
  const [existingRegistrationPin, setExistingRegistrationPin] = useState('');
  const sessionRef = useRef<EmbeddedSignupSession | null>(null);
  const waiterRef = useRef<SessionWaiter | null>(null);

  const settleWaiter = useCallback(
    (result: { session: EmbeddedSignupSession } | { error: Error }) => {
      const waiter = waiterRef.current;
      if (!waiter) return;
      clearTimeout(waiter.timeout);
      waiterRef.current = null;
      if ('session' in result) waiter.resolve(result.session);
      else waiter.reject(result.error);
    },
    []
  );

  useEffect(() => {
    if (profileLoading) return;
    if (!canEditSettings) {
      setLoading(false);
      return;
    }

    let active = true;
    async function prepare() {
      try {
        setLoading(true);
        setSetupError('');
        const response = await fetch('/api/whatsapp/embedded-signup', {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = (await response.json()) as
          | EmbeddedSignupSettings
          | {
              error?: string;
              code?: string;
              subscription?: {
                status?: string;
                plan?: string | null;
              };
            };

        if (response.status === 402) {
          if (active) {
            setSubscriptionRequired(true);
            setSettings(null);
            setSdkReady(false);
            setSetupError('');
          }
          return;
        }

        if (!response.ok) {
          throw new Error(
            'error' in payload && payload.error
              ? payload.error
              : 'Meta Embedded Signup is not available.'
          );
        }

        const config = payload as EmbeddedSignupSettings;
        const sdk = await loadFacebookSdk();
        sdk.init({
          appId: config.appId,
          cookie: true,
          xfbml: true,
          version: config.graphApiVersion,
        });
        if (active) {
          setSubscriptionRequired(false);
          setSettings(config);
          setSdkReady(true);
        }
      } catch (error) {
        if (active) {
          setSetupError(
            error instanceof Error
              ? error.message
              : 'Could not prepare Meta Embedded Signup.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    prepare();
    return () => {
      active = false;
    };
  }, [canEditSettings, profileLoading]);

  useEffect(() => {
    function receiveMessage(event: MessageEvent) {
      if (!FACEBOOK_MESSAGE_ORIGINS.has(event.origin)) return;
      const payload = parseEmbeddedSignupMessage(event.data);
      if (!payload || payload.type !== 'WA_EMBEDDED_SIGNUP') return;

      const eventName = typeof payload.event === 'string' ? payload.event : '';
      const data =
        payload.data && typeof payload.data === 'object'
          ? (payload.data as Record<string, unknown>)
          : {};

      if (
        eventName === 'FINISH' ||
        eventName === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
      ) {
        const wabaId = typeof data.waba_id === 'string' ? data.waba_id : '';
        const phoneNumberId =
          typeof data.phone_number_id === 'string' ? data.phone_number_id : '';
        if (!wabaId) {
          settleWaiter({
            error: new Error(
              'Meta finished without returning the WhatsApp Business Account.'
            ),
          });
          return;
        }
        // Coexistence completion can omit phone_number_id. The server
        // resolves it from the WABA using the exchanged access token.
        const session = { wabaId, phoneNumberId: phoneNumberId || undefined };
        sessionRef.current = session;
        settleWaiter({ session });
      } else if (eventName === 'CANCEL') {
        settleWaiter({ error: new Error('Meta onboarding was cancelled.') });
      } else if (eventName === 'ERROR') {
        settleWaiter({
          error: new Error('Meta could not complete onboarding.'),
        });
      }
    }

    window.addEventListener('message', receiveMessage);
    return () => {
      window.removeEventListener('message', receiveMessage);
      if (waiterRef.current) {
        clearTimeout(waiterRef.current.timeout);
        waiterRef.current.reject(new Error('Meta onboarding was interrupted.'));
        waiterRef.current = null;
      }
    };
  }, [settleWaiter]);

  const waitForSession = useCallback((): Promise<EmbeddedSignupSession> => {
    if (sessionRef.current) return Promise.resolve(sessionRef.current);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        waiterRef.current = null;
        reject(new Error('Meta did not return the selected WhatsApp assets.'));
      }, 10000);
      waiterRef.current = { resolve, reject, timeout };
    });
  }, []);

  async function connectWithMeta(
    onboardingMode: 'cloud_api' | 'business_app' = 'cloud_api'
  ) {
    if (!settings || !window.FB || !sdkReady || connecting) return;
    setConnecting(true);
    setRegistrationPin(null);
    setSetupError('');
    sessionRef.current = null;

    try {
      window.FB.login(
        (loginResponse) => {
          void (async () => {
            try {
            const code = loginResponse.authResponse?.code;
            if (!code) {
              throw new Error(
                'Meta login was cancelled or returned no authorization code.'
              );
            }

            const session = await waitForSession();
            const response = await fetch('/api/whatsapp/embedded-signup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code,
                waba_id: session.wabaId,
                phone_number_id: session.phoneNumberId,
                registration_pin: existingRegistrationPin || undefined,
                onboarding_mode: onboardingMode,
              }),
            });
            const payload = (await response.json()) as {
              error?: string;
              registration_pin?: string | null;
              phone_info?: {
                display_phone_number?: string;
                verified_name?: string;
              };
            };
            if (!response.ok) {
              throw new Error(
                payload.error || 'Nexapa could not save the Meta connection.'
              );
            }

            setRegistrationPin(payload.registration_pin || null);
            setExistingRegistrationPin('');
            toast.success(
              payload.phone_info?.verified_name
                ? `${payload.phone_info.verified_name} is connected to Nexapa.`
                : 'WhatsApp is connected to Nexapa.'
            );
            await onConnected();
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Meta onboarding could not be completed.';
            setSetupError(message);
            toast.error(message, { duration: 10000 });
            } finally {
              setConnecting(false);
            }
          })();
        },
        {
          config_id: settings.configurationId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {},
            featureType:
              onboardingMode === 'business_app'
                ? 'whatsapp_business_app_onboarding'
                : '',
            sessionInfoVersion: '3',
          },
        }
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not open Meta onboarding.';
      setSetupError(message);
      toast.error(message);
      setConnecting(false);
    }
  }

  async function copyRegistrationPin() {
    if (!registrationPin) return;
    await navigator.clipboard.writeText(registrationPin);
    toast.success('Registration PIN copied.');
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <MessageCircle className="text-primary size-5" />
              Connect WhatsApp with Meta
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Choose the business and phone number in Meta. Nexapa securely
              configures the API, webhook subscription and encrypted token.
            </CardDescription>
          </div>
          <span className="bg-primary/15 text-primary rounded-full px-2 py-1 text-xs font-medium">
            Recommended
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['1', 'Authorize in Meta'],
            ['2', 'Choose your number'],
            ['3', 'Start using Inbox'],
          ].map(([number, label]) => (
            <div
              key={number}
              className="border-border bg-card/70 text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {number}
              </span>
              {label}
            </div>
          ))}
        </div>

        {setupError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Connection could not be completed</AlertTitle>
            <AlertDescription>{setupError}</AlertDescription>
          </Alert>
        )}

        {registrationPin && (
          <Alert className="border-emerald-700/40 bg-emerald-950/20">
            <CheckCircle2 className="text-emerald-500" />
            <AlertTitle>Save this WhatsApp registration PIN</AlertTitle>
            <AlertDescription>
              <div className="mt-2 flex items-center gap-2">
                <code className="bg-muted text-foreground rounded px-3 py-1.5 font-mono text-base tracking-[0.3em]">
                  {registrationPin}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyRegistrationPin}
                >
                  <Copy /> Copy
                </Button>
              </div>
              <p className="mt-2 text-xs">
                This PIN is shown once. It is not a webhook token and customers
                never need to paste an access token into Nexapa.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <details className="border-border bg-card/50 rounded-lg border px-3 py-2">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
            Connecting a number already used with Cloud API?
          </summary>
          <div className="mt-3 space-y-2">
            <Label htmlFor="existing-whatsapp-pin">
              Existing two-step-verification PIN (optional)
            </Label>
            <Input
              id="existing-whatsapp-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={existingRegistrationPin}
              onChange={(event) =>
                setExistingRegistrationPin(
                  event.target.value.replace(/\D/g, '').slice(0, 6)
                )
              }
              placeholder="6-digit PIN"
            />
            <p className="text-muted-foreground text-xs">
              Leave this blank for a new number. This is the number&apos;s Meta
              two-step PIN, not a webhook token or API token.
            </p>
          </div>
        </details>

        {subscriptionRequired && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                <LockKeyhole className="size-4" />
              </div>
              <div>
                <p className="text-foreground text-sm font-semibold">
                  Aktifkan WhatsApp API
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  Pilih paket Nexapa untuk menghubungkan nomor WhatsApp
                  Business melalui Meta dan menggunakan Inbox, broadcast,
                  automation, flow, serta AI reply.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={
              subscriptionRequired
                ? () => setShowPlans(true)
                : () => connectWithMeta('cloud_api')
            }
            disabled={
              profileLoading ||
              !canEditSettings ||
              (
                !subscriptionRequired &&
                (
                  loading ||
                  !sdkReady ||
                  connecting
                )
              )
            }
            title={
              !canEditSettings
                ? 'Only workspace admins can change WhatsApp settings'
                : subscriptionRequired
                  ? 'Pilih paket untuk mengaktifkan WhatsApp API'
                  : 'Connect a WhatsApp Business account'
            }
          >
            {loading || connecting ? (
              <Loader2 className="animate-spin" />
            ) : subscriptionRequired ? (
              <LockKeyhole />
            ) : (
              <ShieldCheck />
            )}
            {subscriptionRequired
              ? 'Lihat Pilihan Paket'
              : connecting
                ? 'Finishing connection…'
                : 'Connect Cloud API number'}
          </Button>
          {!subscriptionRequired && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => connectWithMeta('business_app')}
              disabled={
                profileLoading ||
                !canEditSettings ||
                loading ||
                !sdkReady ||
                connecting
              }
              title="Keep using this number in the WhatsApp Business app and Nexapa CRM"
            >
              {connecting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <MessageCircle />
              )}
              Connect WhatsApp Business on phone
            </Button>
          )}
          <a
            href="https://developers.facebook.com/docs/whatsapp/embedded-signup"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 inline-flex items-center gap-1.5 text-sm"
          >
            How Meta onboarding works <ExternalLink className="size-3.5" />
          </a>
        </div>

        {!canEditSettings && !profileLoading && (
          <p className="text-muted-foreground text-xs">
            Your workspace is read-only. Ask an owner or admin to connect
            WhatsApp.
          </p>
        )}

        {showPlans && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="whatsapp-plan-title"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowPlans(false);
              }
            }}
          >
            <div className="bg-background border-border relative w-full max-w-5xl rounded-2xl border p-5 shadow-2xl sm:p-7">
              <button
                type="button"
                onClick={() => setShowPlans(false)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-4 top-4 flex size-9 items-center justify-center rounded-full transition"
                aria-label="Tutup pilihan paket"
              >
                <X className="size-4" />
              </button>

              <div className="pr-12">
                <p className="text-primary text-xs font-semibold uppercase tracking-[0.18em]">
                  Nexapa WhatsApp API
                </p>
                <h2
                  id="whatsapp-plan-title"
                  className="text-foreground mt-2 text-2xl font-bold"
                >
                  Pilih paket untuk mulai terhubung
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Setelah paket aktif, tombol onboarding Meta otomatis
                  terbuka tanpa perlu membuat akun CRM baru.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  {
                    code: 'starter',
                    name: 'Starter',
                    price: 'Rp50.000',
                    description:
                      'Untuk memulai operasional WhatsApp bisnis.',
                    features: [
                      '1 nomor WhatsApp',
                      '1 anggota workspace',
                      '1.000 kontak CRM',
                      '50 permintaan AI/bulan',
                    ],
                  },
                  {
                    code: 'pro',
                    name: 'Pro',
                    price: 'Rp75.000',
                    description:
                      'Untuk tim yang mulai berkembang.',
                    features: [
                      '1 nomor WhatsApp',
                      '5 anggota workspace',
                      '5.000 kontak CRM',
                      '300 permintaan AI/bulan',
                    ],
                    recommended: true,
                  },
                  {
                    code: 'business',
                    name: 'Business',
                    price: 'Rp100.000',
                    description:
                      'Untuk operasional dengan volume lebih besar.',
                    features: [
                      '3 nomor WhatsApp',
                      '15 anggota workspace',
                      '25.000 kontak CRM',
                      '1.000 permintaan AI/bulan',
                    ],
                  },
                ].map((plan) => (
                  <section
                    key={plan.code}
                    className={
                      plan.recommended
                        ? 'border-primary bg-primary/5 relative rounded-xl border-2 p-5'
                        : 'border-border bg-card relative rounded-xl border p-5'
                    }
                  >
                    {plan.recommended && (
                      <span className="bg-primary text-primary-foreground absolute -top-3 left-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                        Rekomendasi
                      </span>
                    )}

                    <h3 className="text-foreground text-lg font-bold">
                      {plan.name}
                    </h3>
                    <div className="mt-3 flex items-end gap-1">
                      <span className="text-foreground text-2xl font-bold">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground pb-1 text-xs">
                        /bulan
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-3 min-h-10 text-xs leading-5">
                      {plan.description}
                    </p>

                    <ul className="mt-4 space-y-2">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="text-muted-foreground flex items-center gap-2 text-xs"
                        >
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <a
                      href={`https://nexapa.app/pricing.html?plan=${plan.code}`}
                      className={
                        plan.recommended
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 mt-5 flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition'
                          : 'border-border bg-background text-foreground hover:bg-muted mt-5 flex h-10 items-center justify-center rounded-lg border text-sm font-semibold transition'
                      }
                    >
                      Pilih {plan.name}
                    </a>
                  </section>
                ))}
              </div>

              <p className="text-muted-foreground mt-5 text-center text-xs">
                Pembayaran production akan diaktifkan setelah integrasi
                payment gateway selesai.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
