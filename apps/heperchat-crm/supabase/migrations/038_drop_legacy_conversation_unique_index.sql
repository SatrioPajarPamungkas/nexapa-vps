-- Included from the original unlimited WhatsApp migration.
-- One CRM account may own any number of WhatsApp phone connections.
-- Existing rows remain the active connection and existing conversations
-- are attached to that row, so this migration is safe for live installs.

alter table public.whatsapp_config
  add column if not exists label text,
  add column if not exists display_phone_number text,
  add column if not exists is_active boolean not null default false;

-- Keep exactly one default connection per account. Reset first because
-- an existing partial unique index rejects swapping active rows in one UPDATE.
update public.whatsapp_config
set is_active = false
where is_active = true;

with ranked as (
  select id, row_number() over (
    partition by account_id
    order by connected_at desc nulls last, created_at asc, id
  ) as position
  from public.whatsapp_config
)
update public.whatsapp_config as config
set is_active = true
from ranked
where ranked.id = config.id
  and ranked.position = 1;

-- Remove legacy UNIQUE(account_id) regardless of its generated name.
do $$
declare constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'whatsapp_config'
      and con.contype = 'u'
      and (select array_agg(att.attname::text order by key.ordinality)
           from unnest(con.conkey) with ordinality key(attnum, ordinality)
           join pg_attribute att on att.attrelid = rel.oid and att.attnum = key.attnum)
          = array['account_id']::text[]
  loop
    execute format('alter table public.whatsapp_config drop constraint %I', constraint_name);
  end loop;
end $$;

create unique index if not exists whatsapp_config_phone_number_unique
  on public.whatsapp_config(phone_number_id);
create unique index if not exists whatsapp_config_one_active_per_account
  on public.whatsapp_config(account_id) where is_active;
create index if not exists whatsapp_config_account_created_idx
  on public.whatsapp_config(account_id, created_at);

create or replace function public.activate_whatsapp_connection(connection_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare target_account_id uuid;
begin
  select account_id into target_account_id
  from public.whatsapp_config
  where id = connection_id
  for update;
  if target_account_id is null then
    raise exception 'WhatsApp connection not found';
  end if;

  perform 1 from public.whatsapp_config
  where account_id = target_account_id
  for update;

  update public.whatsapp_config
  set is_active = (id = connection_id), updated_at = now()
  where account_id = target_account_id;
end;
$$;

alter table public.conversations
  add column if not exists whatsapp_config_id uuid
    references public.whatsapp_config(id) on delete cascade;

-- Bind legacy conversations to their account's active (legacy) connection.
update public.conversations as conversation
set whatsapp_config_id = config.id
from public.whatsapp_config as config
where conversation.whatsapp_config_id is null
  and config.account_id = conversation.account_id
  and config.is_active;

-- Remove the legacy one-chat-per-(account, contact) uniqueness. PostgreSQL
-- indexes are handled separately because older installs used both forms.
do $$
declare constraint_name text;
declare index_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public' and rel.relname = 'conversations'
      and con.contype = 'u'
      and (select array_agg(att.attname::text order by key.ordinality)
           from unnest(con.conkey) with ordinality key(attnum, ordinality)
           join pg_attribute att on att.attrelid = rel.oid and att.attnum = key.attnum)
          = array['account_id','contact_id']::text[]
  loop
    execute format('alter table public.conversations drop constraint %I', constraint_name);
  end loop;

  for index_name in
    select indexname from pg_indexes
    where schemaname = 'public' and tablename = 'conversations'
      and indexdef ~* '\\(account_id, contact_id\\)'
      and indexdef ~* '^create unique index'
  loop
    execute format('drop index if exists public.%I', index_name);
  end loop;
end $$;

create unique index if not exists conversations_connection_contact_unique
  on public.conversations(account_id, whatsapp_config_id, contact_id)
  where whatsapp_config_id is not null;
create index if not exists conversations_connection_idx
  on public.conversations(whatsapp_config_id, last_message_at desc);

comment on column public.whatsapp_config.is_active is
  'Default connection for new outbound conversations; existing chats use conversations.whatsapp_config_id.';
comment on column public.conversations.whatsapp_config_id is
  'Immutable WhatsApp connection owning this chat, preventing cross-number mixing.';

-- Follow-up cleanup for legacy conversation indexes.
-- Migration 037 widened conversation identity to include the WhatsApp
-- connection. Some older installations named the previous unique index
-- idx_conversations_account_contact and formatted its definition in a way
-- the compatibility matcher did not catch. Remove every remaining exact
-- UNIQUE(account_id, contact_id) index, then assert the new identity exists.

alter table public.conversations
  drop constraint if exists idx_conversations_account_contact;
drop index if exists public.idx_conversations_account_contact;

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
