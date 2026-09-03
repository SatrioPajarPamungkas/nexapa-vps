-- Migration 037 widened conversation identity to include the WhatsApp
-- connection. Some older installations named the previous unique index
-- idx_conversations_account_contact and formatted its definition in a way
-- the compatibility matcher did not catch. Remove every remaining exact
-- UNIQUE(account_id, contact_id) index, then assert the new identity exists.

do $$
declare legacy_constraint text;
declare legacy_index text;
begin
  for legacy_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'conversations'
      and con.contype = 'u'
      and (select array_agg(att.attname::text order by key.ordinality)
           from unnest(con.conkey) with ordinality key(attnum, ordinality)
           join pg_attribute att
             on att.attrelid = rel.oid and att.attnum = key.attnum)
          = array['account_id', 'contact_id']::text[]
  loop
    execute format(
      'alter table public.conversations drop constraint %I',
      legacy_constraint
    );
  end loop;

  for legacy_index in
    select index_rel.relname
    from pg_index idx
    join pg_class table_rel on table_rel.oid = idx.indrelid
    join pg_namespace ns on ns.oid = table_rel.relnamespace
    join pg_class index_rel on index_rel.oid = idx.indexrelid
    where ns.nspname = 'public'
      and table_rel.relname = 'conversations'
      and idx.indisunique
      and (select array_agg(att.attname::text order by key.ordinality)
           from unnest(idx.indkey::smallint[]) with ordinality key(attnum, ordinality)
           join pg_attribute att
             on att.attrelid = table_rel.oid and att.attnum = key.attnum)
          = array['account_id', 'contact_id']::text[]
  loop
    execute format('drop index if exists public.%I', legacy_index);
  end loop;
end $$;

create unique index if not exists conversations_connection_contact_unique
  on public.conversations(account_id, whatsapp_config_id, contact_id)
  where whatsapp_config_id is not null;
