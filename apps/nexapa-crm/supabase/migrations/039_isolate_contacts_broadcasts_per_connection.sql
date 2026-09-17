-- Isolate CRM contacts and broadcasts by WhatsApp connection.

alter table public.contacts
  add column if not exists whatsapp_config_id uuid
  references public.whatsapp_config(id) on delete cascade;

alter table public.broadcasts
  add column if not exists whatsapp_config_id uuid
  references public.whatsapp_config(id) on delete cascade;

-- Assign legacy rows to each account's active connection.
update public.contacts c
set whatsapp_config_id = w.id
from public.whatsapp_config w
where c.whatsapp_config_id is null
  and w.account_id = c.account_id
  and w.is_active;

update public.broadcasts b
set whatsapp_config_id = w.id
from public.whatsapp_config w
where b.whatsapp_config_id is null
  and w.account_id = b.account_id
  and w.is_active;

-- Remove legacy per-account contact identity uniqueness.
do $$
declare object_name text;
begin
  for object_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'contacts'
      and con.contype = 'u'
      and (
        select array_agg(att.attname::text order by key.ordinality)
        from unnest(con.conkey) with ordinality key(attnum, ordinality)
        join pg_attribute att
          on att.attrelid = rel.oid
         and att.attnum = key.attnum
      ) in (
        array['account_id','phone']::text[],
        array['account_id','phone_normalized']::text[],
        array['account_id','whatsapp_user_id']::text[]
      )
  loop
    execute format(
      'alter table public.contacts drop constraint %I',
      object_name
    );
  end loop;

  for object_name in
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'contacts'
      and indexdef ~* '^create unique index'
      and (
        indexdef ~* '\(account_id, phone\)'
        or indexdef ~* '\(account_id, phone_normalized\)'
        or indexdef ~* '\(account_id, whatsapp_user_id\)'
      )
  loop
    execute format('drop index if exists public.%I', object_name);
  end loop;
end $$;

create unique index if not exists contacts_connection_phone_unique
  on public.contacts(account_id, whatsapp_config_id, phone_normalized)
  where whatsapp_config_id is not null
    and phone_normalized is not null
    and phone_normalized <> '';

create unique index if not exists contacts_connection_bsuid_unique
  on public.contacts(account_id, whatsapp_config_id, whatsapp_user_id)
  where whatsapp_config_id is not null
    and whatsapp_user_id is not null;

create index if not exists contacts_connection_created_idx
  on public.contacts(whatsapp_config_id, created_at desc);

create index if not exists broadcasts_connection_created_idx
  on public.broadcasts(whatsapp_config_id, created_at desc);

-- Default manual/API inserts to the currently active connection.
create or replace function public.assign_active_whatsapp_connection()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.whatsapp_config_id is null then
    select id into new.whatsapp_config_id
    from public.whatsapp_config
    where account_id = new.account_id
      and is_active
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists contacts_assign_active_connection
  on public.contacts;

create trigger contacts_assign_active_connection
before insert on public.contacts
for each row execute function public.assign_active_whatsapp_connection();

drop trigger if exists broadcasts_assign_active_connection
  on public.broadcasts;

create trigger broadcasts_assign_active_connection
before insert on public.broadcasts
for each row execute function public.assign_active_whatsapp_connection();

-- Restrictive policies are combined with existing account-level RLS.
drop policy if exists contacts_active_connection_scope
  on public.contacts;

create policy contacts_active_connection_scope
on public.contacts
as restrictive
for all
to authenticated
using (
  whatsapp_config_id in (
    select id
    from public.whatsapp_config
    where account_id = contacts.account_id
      and is_active
  )
)
with check (
  whatsapp_config_id in (
    select id
    from public.whatsapp_config
    where account_id = contacts.account_id
      and is_active
  )
);

drop policy if exists broadcasts_active_connection_scope
  on public.broadcasts;

create policy broadcasts_active_connection_scope
on public.broadcasts
as restrictive
for all
to authenticated
using (
  whatsapp_config_id in (
    select id
    from public.whatsapp_config
    where account_id = broadcasts.account_id
      and is_active
  )
)
with check (
  whatsapp_config_id in (
    select id
    from public.whatsapp_config
    where account_id = broadcasts.account_id
      and is_active
  )
);

comment on column public.contacts.whatsapp_config_id is
  'WhatsApp connection owning this contact. Same customer may exist independently on multiple connections.';

comment on column public.broadcasts.whatsapp_config_id is
  'WhatsApp connection owning and sending this broadcast.';
