import 'server-only'

import { supabaseAdmin } from '@/lib/flows/admin-client'

export interface PlatformWorkspace {
  id: string
  name: string
  status: 'active' | 'suspended'
  plan: string
  memberLimit: number
  messageLimit: number
  members: number
  whatsapp: 'connected' | 'not_configured' | 'error'
  phoneNumberId: string | null
  createdAt: string
  suspensionReason: string | null
}

export async function getPlatformDashboard() {
  const db = supabaseAdmin()
  const [accountsResult, profilesResult, whatsappResult, auditResult, messagesResult] = await Promise.all([
    db.from('accounts').select('id,name,platform_status,plan,member_limit,monthly_message_limit,suspension_reason,created_at').order('created_at', { ascending: false }),
    db.from('profiles').select('account_id'),
    db.from('whatsapp_config').select('account_id,phone_number_id,status'),
    db.from('platform_admin_audit_logs').select('id,action,target_type,target_id,metadata,created_at,actor_user_id').order('created_at', { ascending: false }).limit(30),
    db.from('messages').select('id', { count: 'exact', head: true }),
  ])

  if (accountsResult.error) throw accountsResult.error
  const memberCounts = new Map<string, number>()
  for (const row of profilesResult.data ?? []) {
    if (row.account_id) memberCounts.set(row.account_id, (memberCounts.get(row.account_id) ?? 0) + 1)
  }
  const whatsapp = new Map((whatsappResult.data ?? []).map((row) => [row.account_id, row]))

  const workspaces: PlatformWorkspace[] = (accountsResult.data ?? []).map((account) => {
    const config = whatsapp.get(account.id)
    return {
      id: account.id,
      name: account.name,
      status: account.platform_status,
      plan: account.plan,
      memberLimit: account.member_limit,
      messageLimit: account.monthly_message_limit,
      members: memberCounts.get(account.id) ?? 0,
      whatsapp: !config?.phone_number_id ? 'not_configured' : config.status === 'active' ? 'connected' : 'error',
      phoneNumberId: config?.phone_number_id ?? null,
      createdAt: account.created_at,
      suspensionReason: account.suspension_reason,
    }
  })

  return {
    workspaces,
    audit: auditResult.data ?? [],
    stats: {
      workspaces: workspaces.length,
      active: workspaces.filter((w) => w.status === 'active').length,
      suspended: workspaces.filter((w) => w.status === 'suspended').length,
      members: profilesResult.data?.length ?? 0,
      whatsappConnected: workspaces.filter((w) => w.whatsapp === 'connected').length,
      messages: messagesResult.count ?? 0,
    },
  }
}

