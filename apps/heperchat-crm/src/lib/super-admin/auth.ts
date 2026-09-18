import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth/account'

export type PlatformAdminRole = 'owner' | 'admin' | 'support' | 'viewer'

export interface PlatformAdminContext {
  userId: string
  email: string | null
  role: PlatformAdminRole
}

export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new UnauthorizedError()

  const { data: admin, error: adminError } = await supabaseAdmin()
    .from('platform_admins')
    .select('role, active')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminError) {
    console.error('[platform-admin] authorization lookup failed:', adminError)
    throw new ForbiddenError('Super Admin is not configured')
  }
  if (!admin?.active) throw new ForbiddenError('Super Admin access required')

  return { userId: user.id, email: user.email ?? null, role: admin.role as PlatformAdminRole }
}

export function canManagePlatform(role: PlatformAdminRole) {
  return role === 'owner' || role === 'admin'
}

