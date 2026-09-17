import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type CheckoutResponse = {
  success?: boolean
  message?: string
  data?: {
    redirect_url?: string | null
  }
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const origin = request.headers.get("origin")

  if (origin && origin !== requestUrl.origin) {
    return NextResponse.json(
      { success: false, message: "Origin checkout tidak valid." },
      { status: 403 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Silakan masuk ke CRM terlebih dahulu." },
      { status: 401 },
    )
  }

  let body: {
    plan_code?: unknown
    billing_cycle?: unknown
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, message: "Permintaan checkout tidak valid." },
      { status: 400 },
    )
  }

  const planCode =
    typeof body.plan_code === "string"
      ? body.plan_code.trim().toLowerCase()
      : ""
  const billingCycle = body.billing_cycle

  if (
    !/^[a-z0-9_-]{1,100}$/.test(planCode) ||
    !["monthly", "yearly"].includes(String(billingCycle))
  ) {
    return NextResponse.json(
      { success: false, message: "Paket atau periode pembayaran tidak valid." },
      { status: 422 },
    )
  }

  const apiUrl = process.env.NEXAPA_API_INTERNAL_URL?.replace(/\/+$/, "")
  const entitlementKey = process.env.NEXAPA_ENTITLEMENT_KEY

  if (!apiUrl || !entitlementKey) {
    return NextResponse.json(
      { success: false, message: "Konfigurasi pembayaran CRM belum lengkap." },
      { status: 503 },
    )
  }

  let response: Response

  try {
    response = await fetch(
      `${apiUrl}/api/internal/crm-subscription/checkout`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Nexapa-Entitlement-Key": entitlementKey,
        },
        body: JSON.stringify({
          crm_user_id: user.id,
          plan_code: planCode,
          billing_cycle: billingCycle,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    )
  } catch {
    return NextResponse.json(
      { success: false, message: "Layanan pembayaran tidak dapat dihubungi." },
      { status: 503 },
    )
  }

  const result = (await response.json().catch(() => ({
    success: false,
    message: "Respons pembayaran tidak valid.",
  }))) as CheckoutResponse

  return NextResponse.json(result, { status: response.status })
}
