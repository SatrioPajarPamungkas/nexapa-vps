"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type CheckoutButtonProps = {
  planCode: string
  billingCycle: "monthly" | "yearly"
}

function midtransUrl(value: unknown): string | null {
  if (typeof value !== "string") return null

  try {
    const url = new URL(value)
    const validHost =
      url.hostname === "midtrans.com" ||
      url.hostname.endsWith(".midtrans.com")

    return url.protocol === "https:" && validHost
      ? url.toString()
      : null
  } catch {
    return null
  }
}

export function CheckoutButton({
  planCode,
  billingCycle,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const started = useRef(false)

  const checkout = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_code: planCode,
          billing_cycle: billingCycle,
        }),
      })

      const result = await response.json().catch(() => null) as {
        message?: string
        data?: { redirect_url?: string | null }
      } | null

      if (!response.ok) {
        throw new Error(result?.message || "Checkout CRM gagal.")
      }

      const redirectUrl = midtransUrl(result?.data?.redirect_url)

      if (!redirectUrl) {
        throw new Error("URL pembayaran Midtrans tidak valid.")
      }

      window.location.assign(redirectUrl)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Checkout CRM gagal.",
      )
      setLoading(false)
    }
  }, [billingCycle, planCode])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void checkout()
  }, [checkout])

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => void checkout()}
        disabled={loading}
        className="w-full rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
      >
        {loading
          ? "Mengarahkan ke Midtrans..."
          : "Bayar dengan Midtrans"}
      </button>

      {error && (
        <p className="mt-3 rounded-xl border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  )
}
