-- CRM-only. Run once against the SAME Supabase project used by nexapa-crm.
-- Additive migration; does not resend messages or rewrite historical broadcasts.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='broadcasts' AND column_name='whatsapp_config_id')
  OR NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='broadcast_recipients' AND column_name='whatsapp_message_id')
  OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.broadcast_recipients'::regclass
    AND tgname='broadcast_recipients_aggregate' AND tgenabled <> 'D') THEN
    RAISE EXCEPTION 'CRM schema prerequisite missing: connection isolation, WAMID, or aggregate trigger';
  END IF;
END $$;

CREATE TABLE public.crm_blast_status_receipts (
  phone_number_id text NOT NULL,
  whatsapp_message_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent','delivered','read','failed')),
  event_at timestamptz NOT NULL,
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (phone_number_id, whatsapp_message_id)
);
ALTER TABLE public.crm_blast_status_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_blast_status_receipts FROM PUBLIC, anon, authenticated;
-- No browser policy: only the signed-webhook server RPC may write receipts.

CREATE FUNCTION public.crm_blast_next_status(current_status text, incoming_status text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT CASE
    WHEN incoming_status = 'failed' AND current_status IN ('pending','sent') THEN 'failed'
    WHEN current_status = 'failed' THEN current_status
    WHEN array_position(ARRAY['pending','sent','delivered','read','replied'], incoming_status)
       > COALESCE(array_position(ARRAY['pending','sent','delivered','read','replied'], current_status),0)
      THEN incoming_status
    ELSE current_status END
$$;

CREATE FUNCTION public.crm_blast_recipient_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  phone_id text;
  receipt public.crm_blast_status_receipts%ROWTYPE;
  merged text;
BEGIN
  -- Serialize a sender's ID assignment with receipt ingestion. A nonblocking
  -- lock avoids row-lock/advisory-lock inversion: callers retry DB writes only.
  IF NEW.whatsapp_message_id IS NOT NULL THEN
    SELECT c.phone_number_id INTO phone_id
    FROM public.broadcasts b JOIN public.whatsapp_config c
      ON c.id=b.whatsapp_config_id AND c.account_id=b.account_id
    WHERE b.id=NEW.broadcast_id;
    IF phone_id IS NOT NULL AND NOT pg_try_advisory_xact_lock(
      hashtextextended('crm_blast:' || phone_id || ':' || NEW.whatsapp_message_id,0)) THEN
      RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='CRM receipt busy; retry database write only';
    END IF;
  END IF;

  IF TG_OP='UPDATE' AND OLD.whatsapp_message_id IS NOT DISTINCT FROM NEW.whatsapp_message_id THEN
    merged := public.crm_blast_next_status(OLD.status, NEW.status);
    IF merged=OLD.status THEN
      NEW.status := OLD.status;
      IF OLD.status='failed' THEN
        NEW.error_message := COALESCE(OLD.error_message, NEW.error_message);
      ELSE
        NEW.error_message := OLD.error_message;
      END IF;
      NEW.delivered_at := OLD.delivered_at;
      NEW.read_at := OLD.read_at;
      NEW.replied_at := OLD.replied_at;
    END IF;
    NEW.sent_at := COALESCE(OLD.sent_at, NEW.sent_at);
  END IF;

  IF phone_id IS NOT NULL AND NEW.whatsapp_message_id IS NOT NULL THEN
    SELECT * INTO receipt FROM public.crm_blast_status_receipts
    WHERE phone_number_id=phone_id AND whatsapp_message_id=NEW.whatsapp_message_id;
    IF FOUND THEN
      merged := public.crm_blast_next_status(NEW.status, receipt.status);
      IF merged=receipt.status THEN
        NEW.status := merged;
        IF merged='failed' THEN
          NEW.error_message := COALESCE(receipt.error_message, NEW.error_message, 'Meta delivery failed');
        ELSE
          NEW.error_message := NULL;
        END IF;
        IF merged='sent' THEN NEW.sent_at := COALESCE(NEW.sent_at,receipt.event_at); END IF;
        IF merged='delivered' THEN NEW.delivered_at := COALESCE(NEW.delivered_at,receipt.event_at); END IF;
        IF merged='read' THEN NEW.read_at := COALESCE(NEW.read_at,receipt.event_at); END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER crm_blast_recipient_guard
BEFORE INSERT OR UPDATE ON public.broadcast_recipients
FOR EACH ROW EXECUTE FUNCTION public.crm_blast_recipient_guard();

CREATE FUNCTION public.crm_blast_record_status(
  p_phone_number_id text, p_message_id text, p_status text,
  p_event_at timestamptz, p_error_message text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE receipt public.crm_blast_status_receipts%ROWTYPE;
BEGIN
  IF NULLIF(p_phone_number_id,'') IS NULL OR NULLIF(p_message_id,'') IS NULL
     OR p_status IS NULL OR p_status NOT IN ('sent','delivered','read','failed') OR p_event_at IS NULL THEN
    RAISE EXCEPTION 'Invalid CRM receipt' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('crm_blast:' || p_phone_number_id || ':' || p_message_id,0));
  INSERT INTO public.crm_blast_status_receipts AS r
    (phone_number_id,whatsapp_message_id,status,event_at,error_message)
  VALUES (p_phone_number_id,p_message_id,p_status,p_event_at,
    CASE WHEN p_status='failed' THEN left(p_error_message,2000) END)
  ON CONFLICT (phone_number_id,whatsapp_message_id) DO UPDATE SET
    status=public.crm_blast_next_status(r.status,excluded.status),
    event_at=CASE WHEN public.crm_blast_next_status(r.status,excluded.status)<>r.status
      THEN excluded.event_at ELSE r.event_at END,
    error_message=CASE
      WHEN public.crm_blast_next_status(r.status,excluded.status)='failed'
        THEN COALESCE(r.error_message,excluded.error_message)
      ELSE NULL END
  RETURNING * INTO receipt;

  -- BEFORE trigger merges atomically with the current recipient state; the
  -- existing AFTER aggregate trigger sees the final state and updates counters.
  UPDATE public.broadcast_recipients r SET status=receipt.status,
    error_message=receipt.error_message,
    sent_at=CASE WHEN receipt.status='sent' THEN COALESCE(r.sent_at,receipt.event_at) ELSE r.sent_at END,
    delivered_at=CASE WHEN receipt.status='delivered' THEN COALESCE(r.delivered_at,receipt.event_at) ELSE r.delivered_at END,
    read_at=CASE WHEN receipt.status='read' THEN COALESCE(r.read_at,receipt.event_at) ELSE r.read_at END
  FROM public.broadcasts b JOIN public.whatsapp_config c
    ON c.id=b.whatsapp_config_id AND c.account_id=b.account_id
  WHERE r.broadcast_id=b.id AND c.phone_number_id=p_phone_number_id
    AND r.whatsapp_message_id=p_message_id;
END $$;

REVOKE ALL ON FUNCTION public.crm_blast_next_status(text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.crm_blast_recipient_guard() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.crm_blast_record_status(text,text,text,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_blast_record_status(text,text,text,timestamptz,text) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
