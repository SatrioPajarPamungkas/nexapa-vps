"use client"

import { createBrowserClient } from "@supabase/ssr"
import { useState } from "react"

export function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function logout() {
    setLoading(true)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
    >
      {loading ? "Keluar..." : "Keluar akun"}
    </button>
  )
}
