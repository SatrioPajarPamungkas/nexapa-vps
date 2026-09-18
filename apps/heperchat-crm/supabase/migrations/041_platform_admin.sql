-- 041_platform_admin.sql
-- Platform administration for HeperChat. Idempotent and service-role only.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS platform_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS member_limit INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS monthly_message_limit INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_platform_status_check,
  DROP CONSTRAINT IF EXISTS accounts_member_limit_check,
  DROP CONSTRAINT IF EXISTS accounts_monthly_message_limit_check;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_platform_status_check
    CHECK (platform_status IN ('active', 'suspended')),
  ADD CONSTRAINT accounts_member_limit_check
    CHECK (member_limit >= 1),
  ADD CONSTRAINT accounts_monthly_message_limit_check
    CHECK (monthly_message_limit >= 0);

CREATE INDEX IF NOT EXISTS idx_accounts_platform_status
  ON public.accounts(platform_status);

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('owner', 'admin', 'support', 'viewer')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_admin_audit_logs_created_at
  ON public.platform_admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_admin_audit_logs_actor
  ON public.platform_admin_audit_logs(actor_user_id, created_at DESC);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admin_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.platform_admins FROM anon, authenticated;
REVOKE ALL ON public.platform_admin_audit_logs FROM anon, authenticated;
GRANT ALL ON public.platform_admins TO service_role;
GRANT ALL ON public.platform_admin_audit_logs TO service_role;

DROP TRIGGER IF EXISTS set_updated_at ON public.platform_admins;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
