import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/super-admin/auth'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  let admin
  try { admin = await requirePlatformAdmin() } catch { redirect('/dashboard') }
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/10 bg-zinc-950/90">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-6">
          <div className="flex items-center gap-3"><div className="rounded-lg bg-violet-600 p-2"><ShieldCheck className="size-5" /></div><div><div className="font-semibold">Nexapa Control Center</div><div className="text-xs text-zinc-500">Platform administration</div></div></div>
          <div className="flex items-center gap-4 text-sm"><span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-violet-300">{admin.role}</span><span className="hidden text-zinc-400 sm:inline">{admin.email}</span><Link className="text-zinc-300 hover:text-white" href="/dashboard">Buka CRM →</Link></div>
        </div>
      </header>
      {children}
    </div>
  )
}

