import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type EntitlementResponse = {
  allowed: boolean
  whatsapp_enabled?: boolean
  code?: string
  status?: string
  plan?: string
  plan_name?: string
  expires_at?: string
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )

          supabaseResponse = NextResponse.next({ request })

          cookiesToSet.forEach(
            ({ name, value, options }) =>
              supabaseResponse.cookies.set(
                name,
                value,
                options
              )
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const withRefreshedCookies = <
    T extends NextResponse
  >(response: T): T => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })

    return response
  }

  const pathname = request.nextUrl.pathname

  // Paywall global lama sudah tidak digunakan.
  supabaseResponse.cookies.delete(
    'nexapa_subscription_status'
  )
  supabaseResponse.cookies.delete(
    'nexapa_subscription_expires_at'
  )

  const authPaths = [
    '/login',
    '/signup',
    '/forgot-password',
  ]

  if (
    user &&
    authPaths.includes(pathname)
  ) {
    const url = request.nextUrl.clone()
    const inviteToken =
      request.nextUrl.searchParams.get('invite')

    if (
      inviteToken &&
      (
        pathname === '/login' ||
        pathname === '/signup'
      )
    ) {
      url.pathname =
        `/join/${encodeURIComponent(inviteToken)}`
      url.search = ''
    } else {
      url.pathname = '/dashboard'
      url.search = ''
    }

    return withRefreshedCookies(
      NextResponse.redirect(url)
    )
  }

  const protectedPaths = [
    '/dashboard',
    '/inbox',
    '/contacts',
    '/pipelines',
    '/broadcasts',
    '/automations',
    '/flows',
    '/agents',
    '/notifications',
    '/settings',
    '/super-admin',
  ]

  const isProtectedPage = protectedPaths.some(
    (path) => pathname.startsWith(path)
  )

  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'

    return withRefreshedCookies(
      NextResponse.redirect(url)
    )
  }

  const isWebhook =
    pathname.startsWith('/api/whatsapp/webhook')

  const isInternalBackgroundRoute =
    pathname.startsWith('/api/automations/cron') ||
    pathname.startsWith('/api/flows/cron')

  const isAuthenticatedApi =
    user !== null &&
    pathname.startsWith('/api/') &&
    !isWebhook &&
    !isInternalBackgroundRoute

  if (
    !user &&
    pathname.startsWith('/api/whatsapp/') &&
    !isWebhook
  ) {
    return withRefreshedCookies(
      NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    )
  }

  // Subscription hanya diperiksa untuk fitur WhatsApp.
  // Dashboard dan fitur CRM dasar tetap terbuka.
  const shouldCheckEntitlement =
    user !== null &&
    pathname.startsWith('/api/whatsapp/') &&
    !isWebhook

  if (shouldCheckEntitlement) {
    const apiUrl =
      process.env.NEXAPA_API_INTERNAL_URL

    const entitlementKey =
      process.env.NEXAPA_ENTITLEMENT_KEY

    let entitlement: EntitlementResponse

    try {
      if (!apiUrl || !entitlementKey) {
        throw new Error(
          'Entitlement configuration missing'
        )
      }

      const response = await fetch(
        `${apiUrl}/api/internal/crm-entitlement` +
        `?crm_user_id=${encodeURIComponent(user.id)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'X-Nexapa-Entitlement-Key':
              entitlementKey,
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
        }
      )

      if (!response.ok) {
        throw new Error(
          `Entitlement API returned ${response.status}`
        )
      }

      entitlement =
        await response.json() as EntitlementResponse
    } catch {
      if (pathname.startsWith('/api/')) {
        return withRefreshedCookies(
          NextResponse.json(
            {
              error:
                'Subscription verification unavailable',
              code: 'entitlement_unavailable',
            },
            { status: 503 }
          )
        )
      }

      const url = request.nextUrl.clone()
      url.pathname = '/subscription-required'
      url.search = '?status=unavailable'

      return withRefreshedCookies(
        NextResponse.redirect(url)
      )
    }

    // Cookie lama tidak boleh lagi mengunci seluruh dashboard.
    supabaseResponse.cookies.delete(
      'nexapa_subscription_status'
    )
    supabaseResponse.cookies.delete(
      'nexapa_subscription_expires_at'
    )

    const isPaidWhatsappApi =
      pathname.startsWith('/api/whatsapp/') &&
      !isWebhook

    if (
      entitlement.allowed &&
      entitlement.whatsapp_enabled !== true &&
      isPaidWhatsappApi
    ) {
      return withRefreshedCookies(
        NextResponse.json(
          {
            error:
              'Active subscription required for WhatsApp API',
            code:
              entitlement.code ??
              'subscription_required',
            subscription: entitlement,
          },
          { status: 402 }
        )
      )
    }

    if (!entitlement.allowed) {
      if (pathname.startsWith('/api/')) {
        return withRefreshedCookies(
          NextResponse.json(
            {
              error:
                'Active subscription required',
              code:
                entitlement.code ??
                'subscription_required',
              subscription: entitlement,
            },
            { status: 402 }
          )
        )
      }

      // Expired users may see the dashboard shell, but a
      // non-dismissible package modal locks all interaction.
      if (entitlement.status === 'expired') {
        supabaseResponse.cookies.set(
          'nexapa_subscription_status',
          'expired',
          {
            path: '/',
            httpOnly: false,
            secure: true,
            sameSite: 'lax',
            maxAge: 300,
          }
        )

        supabaseResponse.cookies.set(
          'nexapa_subscription_expires_at',
          entitlement.expires_at ?? '',
          {
            path: '/',
            httpOnly: false,
            secure: true,
            sameSite: 'lax',
            maxAge: 300,
          }
        )

        return supabaseResponse
      }

      supabaseResponse.cookies.delete(
        'nexapa_subscription_status'
      )

      supabaseResponse.cookies.delete(
        'nexapa_subscription_expires_at'
      )

      const url = request.nextUrl.clone()
      url.pathname = '/subscription-required'
      url.searchParams.set(
        'status',
        entitlement.status ?? 'missing'
      )

      if (entitlement.expires_at) {
        url.searchParams.set(
          'expires_at',
          entitlement.expires_at
        )
      }

      return withRefreshedCookies(
        NextResponse.redirect(url)
      )
    }

    // Paket kembali aktif: bersihkan status popup.
    supabaseResponse.cookies.delete(
      'nexapa_subscription_status'
    )

    supabaseResponse.cookies.delete(
      'nexapa_subscription_expires_at'
    )
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
