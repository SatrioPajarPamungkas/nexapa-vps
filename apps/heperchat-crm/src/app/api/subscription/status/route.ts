import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { message: "Silakan masuk ke CRM terlebih dahulu." },
      { status: 401 },
    )
  }

  const apiUrl =
    process.env.NEXAPA_API_INTERNAL_URL?.replace(/\/+$/, "")
  const entitlementKey =
    process.env.NEXAPA_ENTITLEMENT_KEY

  if (!apiUrl || !entitlementKey) {
    return NextResponse.json(
      { message: "Konfigurasi status paket belum lengkap." },
      { status: 503 },
    )
  }

  try {
    const response = await fetch(
      `${apiUrl}/api/internal/crm-entitlement` +
        `?crm_user_id=${encodeURIComponent(user.id)}`,
      {
        headers: {
          Accept: "application/json",
          "X-Nexapa-Entitlement-Key": entitlementKey,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    )

    const body = await response.json().catch(() => ({
      message: "Respons status paket tidak valid.",
    }))

    return NextResponse.json(body, {
      status: response.status,
    })
  } catch {
    return NextResponse.json(
      { message: "Layanan status paket tidak dapat dihubungi." },
      { status: 503 },
    )
  }
}
