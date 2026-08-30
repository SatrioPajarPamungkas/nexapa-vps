import { Activity, Building2, MessageSquareText, ShieldBan, Users, Wifi } from 'lucide-react'
import { getPlatformDashboard } from '@/lib/super-admin/data'
import { requirePlatformAdmin, canManagePlatform } from '@/lib/super-admin/auth'
import { updateWorkspace } from './actions'

export const dynamic = 'force-dynamic'

const number = new Intl.NumberFormat('id-ID')

export default async function SuperAdminPage() {
  const [data, admin] = await Promise.all([getPlatformDashboard(), requirePlatformAdmin()])
  const manageable = canManagePlatform(admin.role)
  const cards = [
    ['Workspace', data.stats.workspaces, Building2], ['Workspace aktif', data.stats.active, Activity],
    ['Total pengguna', data.stats.members, Users], ['WhatsApp terhubung', data.stats.whatsappConnected, Wifi],
    ['Total pesan', data.stats.messages, MessageSquareText], ['Ditangguhkan', data.stats.suspended, ShieldBan],
  ] as const

  return <main className="mx-auto max-w-[1500px] space-y-8 px-6 py-8">
    <div><p className="text-sm font-medium text-violet-400">SUPER ADMIN NEXAPA</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Platform overview</h1><p className="mt-2 text-zinc-400">Pantau tenant, koneksi WhatsApp, paket dan batas pemakaian dari satu panel.</p></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="flex items-center justify-between text-zinc-400"><span className="text-xs font-medium uppercase tracking-wide">{label}</span><Icon className="size-4" /></div><div className="mt-3 text-2xl font-bold">{number.format(value)}</div></div>)}</section>
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
      <div className="border-b border-white/10 px-5 py-4"><h2 className="font-semibold">Workspace</h2><p className="text-sm text-zinc-500">Token dan secret WhatsApp tidak pernah ditampilkan.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-white/[.03] text-left text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-3">Nama</th><th>Pengguna</th><th>WhatsApp</th><th>Status</th><th>Paket & limit</th><th className="pr-5">Tindakan</th></tr></thead><tbody>
        {data.workspaces.map((w) => <tr key={w.id} className="border-t border-white/[.07] align-top"><td className="px-5 py-4"><div className="font-medium">{w.name}</div><div className="mt-1 font-mono text-xs text-zinc-600">{w.id}</div></td><td className="py-4">{w.members} / {w.memberLimit}</td><td className="py-4"><span className={w.whatsapp === 'connected' ? 'text-emerald-400' : w.whatsapp === 'error' ? 'text-red-400' : 'text-zinc-500'}>● {w.whatsapp === 'connected' ? 'Terhubung' : w.whatsapp === 'error' ? 'Bermasalah' : 'Belum diatur'}</span>{w.phoneNumberId && <div className="mt-1 font-mono text-xs text-zinc-600">{w.phoneNumberId}</div>}</td><td className="py-4"><span className={w.status === 'active' ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400' : 'rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-400'}>{w.status}</span>{w.suspensionReason && <div className="mt-2 max-w-52 text-xs text-zinc-500">{w.suspensionReason}</div>}</td><td className="py-4"><form action={updateWorkspace} className="flex flex-wrap gap-2"><input type="hidden" name="accountId" value={w.id}/><input type="hidden" name="intent" value="limits"/><input name="plan" defaultValue={w.plan} aria-label="Plan" className="w-24 rounded border border-white/10 bg-zinc-900 px-2 py-1.5"/><input name="memberLimit" type="number" min="1" defaultValue={w.memberLimit} aria-label="Member limit" className="w-20 rounded border border-white/10 bg-zinc-900 px-2 py-1.5"/><input name="messageLimit" type="number" min="0" defaultValue={w.messageLimit} aria-label="Message limit" className="w-28 rounded border border-white/10 bg-zinc-900 px-2 py-1.5"/><button disabled={!manageable} className="rounded bg-violet-600 px-3 py-1.5 font-medium disabled:opacity-40">Simpan</button></form></td><td className="py-4 pr-5"><form action={updateWorkspace}><input type="hidden" name="accountId" value={w.id}/><input type="hidden" name="intent" value="toggle-status"/><input type="hidden" name="currentStatus" value={w.status}/><input name="reason" placeholder="Alasan suspend" className="mb-2 w-full rounded border border-white/10 bg-zinc-900 px-2 py-1.5"/><button disabled={!manageable} className={w.status === 'active' ? 'rounded bg-red-500/15 px-3 py-1.5 text-red-400 disabled:opacity-40' : 'rounded bg-emerald-500/15 px-3 py-1.5 text-emerald-400 disabled:opacity-40'}>{w.status === 'active' ? 'Suspend' : 'Aktifkan'}</button></form></td></tr>)}
      </tbody></table></div>
    </section>
    <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="font-semibold">Audit terbaru</h2><div className="mt-4 space-y-2">{data.audit.length === 0 && <p className="text-sm text-zinc-500">Belum ada aktivitas.</p>}{data.audit.map((row) => <div key={row.id} className="flex flex-col justify-between gap-1 rounded-lg border border-white/[.06] px-3 py-2 text-sm sm:flex-row"><span><b>{row.action}</b> · {row.target_type}:{row.target_id}</span><span className="text-zinc-500">{new Date(row.created_at).toLocaleString('id-ID')}</span></div>)}</div></section>
  </main>
}
