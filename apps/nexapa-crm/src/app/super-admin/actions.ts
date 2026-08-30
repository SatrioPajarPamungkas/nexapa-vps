'use server'

import { revalidatePath } from 'next/cache'
import { canManagePlatform, requirePlatformAdmin } from '@/lib/super-admin/auth'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { ForbiddenError } from '@/lib/auth/account'

export async function updateWorkspace(formData: FormData) {
  const actor = await requirePlatformAdmin()
  if (!canManagePlatform(actor.role)) throw new ForbiddenError('Read-only Super Admin role')

  const accountId = String(formData.get('accountId') ?? '')
  const intent = String(formData.get('intent') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(accountId)) throw new Error('Invalid account')

  const db = supabaseAdmin()
  let patch: Record<string, unknown>
  let action: string
  if (intent === 'toggle-status') {
    const nextStatus = formData.get('currentStatus') === 'active' ? 'suspended' : 'active'
    patch = {
      platform_status: nextStatus,
      suspended_at: nextStatus === 'suspended' ? new Date().toISOString() : null,
      suspended_by: nextStatus === 'suspended' ? actor.userId : null,
      suspension_reason: nextStatus === 'suspended' ? String(formData.get('reason') ?? 'Suspended by Super Admin').slice(0, 500) : null,
    }
    action = nextStatus === 'suspended' ? 'workspace.suspended' : 'workspace.reactivated'
  } else if (intent === 'limits') {
    const memberLimit = Number(formData.get('memberLimit'))
    const messageLimit = Number(formData.get('messageLimit'))
    const plan = String(formData.get('plan') ?? 'free').trim().slice(0, 40)
    if (!Number.isInteger(memberLimit) || memberLimit < 1 || !Number.isInteger(messageLimit) || messageLimit < 0 || !plan) throw new Error('Invalid plan or limits')
    patch = { plan, member_limit: memberLimit, monthly_message_limit: messageLimit }
    action = 'workspace.limits_updated'
  } else {
    throw new Error('Unknown action')
  }

  const { error } = await db.from('accounts').update(patch).eq('id', accountId)
  if (error) throw error
  const { error: auditError } = await db.from('platform_admin_audit_logs').insert({ actor_user_id: actor.userId, action, target_type: 'account', target_id: accountId, metadata: patch })
  if (auditError) console.error('[super-admin] audit insert failed:', auditError)
  revalidatePath('/super-admin')
}

