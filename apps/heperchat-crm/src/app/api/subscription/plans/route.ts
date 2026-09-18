import { NextResponse } from 'next/server'

function apiOrigin() {
  return (
    process.env.NEXAPA_API_URL ||
    process.env.NEXT_PUBLIC_NEXAPA_API_URL ||
    'https://api.nexapa.app'
  )
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/+$/, '')
}

export async function GET() {
  const response = await fetch(
    `${apiOrigin()}/api/v1/subscription/plans?product=crm`,
    {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    },
  )

  const body = await response.json().catch(() => ({
    message: 'Paket CRM gagal dimuat.',
  }))

  return NextResponse.json(body, {
    status: response.status,
  })
}
