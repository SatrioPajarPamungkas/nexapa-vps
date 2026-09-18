-- ============================================================
-- 037_whatsapp_bsuid.sql
-- WhatsApp usernames / Business-Scoped User ID support
-- ============================================================

-- A WhatsApp user may hide their phone number, therefore phone can
-- no longer be the only possible identity of a contact.
ALTER TABLE contacts
  ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS whatsapp_user_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_username TEXT;
-- BSUID is business-portfolio scoped. Nexapa keeps contacts account
-- scoped, therefore uniqueness inside one Nexapa account is correct.
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_account_whatsapp_user_id
  ON contacts(account_id, whatsapp_user_id)
  WHERE whatsapp_user_id IS NOT NULL
    AND whatsapp_user_id <> '';
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_username
  ON contacts(account_id, whatsapp_username)
  WHERE whatsapp_username IS NOT NULL
    AND whatsapp_username <> '';
-- Every contact must have at least one usable identity.
ALTER TABLE contacts
  DROP CONSTRAINT IF EXISTS contacts_whatsapp_identity_check;
ALTER TABLE contacts
  ADD CONSTRAINT contacts_whatsapp_identity_check
  CHECK (
    NULLIF(phone, '') IS NOT NULL
    OR NULLIF(whatsapp_user_id, '') IS NOT NULL
  );
