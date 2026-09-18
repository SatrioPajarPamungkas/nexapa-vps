-- Package-based WABA quota enforcement.
-- Quotas are supplied by the trusted CRM server after reading the
-- Laravel entitlement endpoint. Direct browser calls are not permitted.

create table if not exists public.waba_account_history (
  account_id uuid not null,
  waba_id text not null,
  first_connected_at timestamptz not null default now(),
  last_connected_at timestamptz not null default now(),
  last_disconnected_at timestamptz,
  primary key (account_id, waba_id),
  constraint waba_account_history_waba_id_not_blank
    check (btrim(waba_id) <> '')
);

create table if not exists public.waba_quota_ledger (
  id bigint generated always as identity primary key,
  account_id uuid not null,
  period_starts_at timestamptz not null,
  period_ends_at timestamptz not null,
  waba_id text not null,
  classification text not null,
  connected_at timestamptz not null default now(),
  constraint waba_quota_ledger_period_valid
    check (period_ends_at > period_starts_at),
  constraint waba_quota_ledger_classification_valid
    check (
      classification in (
        'baseline',
        'initial',
        'replacement',
        'reconnect'
      )
    ),
  constraint waba_quota_ledger_unique
    unique (account_id, period_starts_at, waba_id)
);

create table if not exists public.waba_connection_reservations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  waba_id text not null,
  period_starts_at timestamptz not null,
  period_ends_at timestamptz not null,
  waba_limit integer not null,
  replacement_limit integer not null,
  classification text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  consumed_at timestamptz,
  cancelled_at timestamptz,
  constraint waba_reservation_period_valid
    check (period_ends_at > period_starts_at),
  constraint waba_reservation_limits_valid
    check (waba_limit >= 0 and replacement_limit >= 0),
  constraint waba_reservation_classification_valid
    check (
      classification in (
        'existing',
        'initial',
        'replacement',
        'reconnect'
      )
    )
);

create index if not exists waba_history_account_idx
  on public.waba_account_history(account_id);

create index if not exists waba_ledger_period_idx
  on public.waba_quota_ledger(
    account_id,
    period_starts_at,
    classification
  );

create index if not exists waba_reservation_pending_idx
  on public.waba_connection_reservations(
    account_id,
    expires_at
  )
  where consumed_at is null and cancelled_at is null;

alter table public.whatsapp_config
  add column if not exists waba_reservation_id uuid
    references public.waba_connection_reservations(id);

create unique index if not exists whatsapp_config_reservation_unique
  on public.whatsapp_config(waba_reservation_id)
  where waba_reservation_id is not null;

alter table public.waba_account_history enable row level security;
alter table public.waba_quota_ledger enable row level security;
alter table public.waba_connection_reservations enable row level security;

revoke all on public.waba_account_history
  from public, anon, authenticated;
revoke all on public.waba_quota_ledger
  from public, anon, authenticated;
revoke all on public.waba_connection_reservations
  from public, anon, authenticated;

grant select, insert, update, delete
  on public.waba_account_history to service_role;
grant select, insert, update, delete
  on public.waba_quota_ledger to service_role;
grant select, insert, update, delete
  on public.waba_connection_reservations to service_role;
grant usage, select
  on sequence public.waba_quota_ledger_id_seq to service_role;

create or replace function public.reserve_waba_connection(
  p_account_id uuid,
  p_waba_id text,
  p_waba_limit integer,
  p_replacement_limit integer,
  p_period_starts_at timestamptz,
  p_period_ends_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_waba_id text := btrim(p_waba_id);
  active_claims integer := 0;
  period_wabas integer := 0;
  replacements_used integer := 0;
  already_claimed boolean := false;
  seen_before boolean := false;
  period_classification text;
  reservation_id uuid;
begin
  if p_account_id is null then
    raise exception 'WABA_ACCOUNT_REQUIRED';
  end if;

  if normalized_waba_id = ''
     or normalized_waba_id !~ '^[0-9]{5,32}$' then
    raise exception 'WABA_ID_INVALID';
  end if;

  if p_waba_limit < 1 then
    raise exception 'WABA_NOT_INCLUDED_IN_PACKAGE';
  end if;

  if p_replacement_limit < 0 then
    raise exception 'WABA_REPLACEMENT_LIMIT_INVALID';
  end if;

  if p_period_ends_at <= p_period_starts_at then
    raise exception 'WABA_PERIOD_INVALID';
  end if;

  if now() < p_period_starts_at
     or now() >= p_period_ends_at then
    raise exception 'WABA_PERIOD_NOT_ACTIVE';
  end if;

  -- Serialize all reservations belonging to the same workspace.
  perform pg_advisory_xact_lock(
    hashtext(p_account_id::text),
    146291
  );

  update public.waba_connection_reservations
  set cancelled_at = now()
  where account_id = p_account_id
    and consumed_at is null
    and cancelled_at is null
    and expires_at <= now();

  -- Preserve all connections that existed before this migration.
  insert into public.waba_account_history (
    account_id,
    waba_id,
    first_connected_at,
    last_connected_at
  )
  select
    config.account_id,
    btrim(config.waba_id),
    min(coalesce(config.created_at, now())),
    max(coalesce(config.connected_at, config.created_at, now()))
  from public.whatsapp_config as config
  where config.account_id = p_account_id
    and config.waba_id is not null
    and btrim(config.waba_id) <> ''
  group by config.account_id, btrim(config.waba_id)
  on conflict (account_id, waba_id) do update
  set last_connected_at = greatest(
    public.waba_account_history.last_connected_at,
    excluded.last_connected_at
  );

  -- Existing connections become the baseline for the current period.
  insert into public.waba_quota_ledger (
    account_id,
    period_starts_at,
    period_ends_at,
    waba_id,
    classification
  )
  select distinct
    config.account_id,
    p_period_starts_at,
    p_period_ends_at,
    btrim(config.waba_id),
    'baseline'
  from public.whatsapp_config as config
  where config.account_id = p_account_id
    and config.waba_id is not null
    and btrim(config.waba_id) <> ''
  on conflict (account_id, period_starts_at, waba_id)
    do nothing;

  select exists (
    select 1
    from public.whatsapp_config
    where account_id = p_account_id
      and btrim(waba_id) = normalized_waba_id
  ) or exists (
    select 1
    from public.waba_connection_reservations
    where account_id = p_account_id
      and waba_id = normalized_waba_id
      and consumed_at is null
      and cancelled_at is null
      and expires_at > now()
  )
  into already_claimed;

  select count(*)
  into active_claims
  from (
    select btrim(waba_id) as waba_id
    from public.whatsapp_config
    where account_id = p_account_id
      and waba_id is not null
      and btrim(waba_id) <> ''

    union

    select waba_id
    from public.waba_connection_reservations
    where account_id = p_account_id
      and consumed_at is null
      and cancelled_at is null
      and expires_at > now()
  ) as claimed_wabas;

  if not already_claimed and active_claims >= p_waba_limit then
    raise exception
      'WABA_ACTIVE_LIMIT_REACHED:%', p_waba_limit;
  end if;

  select classification
  into period_classification
  from public.waba_quota_ledger
  where account_id = p_account_id
    and period_starts_at = p_period_starts_at
    and waba_id = normalized_waba_id;

  if period_classification is null then
    select exists (
      select 1
      from public.waba_account_history
      where account_id = p_account_id
        and waba_id = normalized_waba_id
    )
    into seen_before;

    if seen_before then
      period_classification := 'reconnect';
    else
      select count(*)
      into period_wabas
      from public.waba_quota_ledger
      where account_id = p_account_id
        and period_starts_at = p_period_starts_at;

      select count(*)
      into replacements_used
      from (
        select waba_id
        from public.waba_quota_ledger
        where account_id = p_account_id
          and period_starts_at = p_period_starts_at
          and classification = 'replacement'

        union

        select waba_id
        from public.waba_connection_reservations
        where account_id = p_account_id
          and period_starts_at = p_period_starts_at
          and classification = 'replacement'
          and consumed_at is null
          and cancelled_at is null
          and expires_at > now()
      ) as replacements;

      if period_wabas < p_waba_limit then
        period_classification := 'initial';
      else
        if replacements_used >= p_replacement_limit then
          raise exception
            'WABA_REPLACEMENT_LIMIT_REACHED:%:%',
            p_replacement_limit,
            p_period_ends_at;
        end if;

        period_classification := 'replacement';
      end if;
    end if;
  else
    period_classification := 'existing';
  end if;

  insert into public.waba_connection_reservations (
    account_id,
    waba_id,
    period_starts_at,
    period_ends_at,
    waba_limit,
    replacement_limit,
    classification
  )
  values (
    p_account_id,
    normalized_waba_id,
    p_period_starts_at,
    p_period_ends_at,
    p_waba_limit,
    p_replacement_limit,
    period_classification
  )
  returning id into reservation_id;

  return jsonb_build_object(
    'reservation_id', reservation_id,
    'classification', period_classification,
    'waba_limit', p_waba_limit,
    'active_wabas', active_claims,
    'replacement_limit', p_replacement_limit,
    'replacements_used', replacements_used,
    'period_ends_at', p_period_ends_at
  );
end;
$$;

create or replace function public.consume_waba_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation public.waba_connection_reservations%rowtype;
  ledger_classification text;
begin
  if tg_op = 'UPDATE'
     and old.account_id is not distinct from new.account_id
     and old.waba_id is not distinct from new.waba_id then
    return new;
  end if;

  if new.waba_id is null or btrim(new.waba_id) = '' then
    raise exception 'WABA_ID_REQUIRED';
  end if;

  if new.waba_reservation_id is null then
    raise exception 'WABA_RESERVATION_REQUIRED';
  end if;

  select *
  into reservation
  from public.waba_connection_reservations
  where id = new.waba_reservation_id
  for update;

  if not found
     or reservation.account_id <> new.account_id
     or reservation.waba_id <> btrim(new.waba_id)
     or reservation.consumed_at is not null
     or reservation.cancelled_at is not null
     or reservation.expires_at <= now() then
    raise exception 'WABA_RESERVATION_INVALID';
  end if;

  update public.waba_connection_reservations
  set consumed_at = now()
  where id = reservation.id;

  ledger_classification := case
    when reservation.classification = 'existing'
      then 'reconnect'
    else reservation.classification
  end;

  insert into public.waba_quota_ledger (
    account_id,
    period_starts_at,
    period_ends_at,
    waba_id,
    classification
  )
  values (
    reservation.account_id,
    reservation.period_starts_at,
    reservation.period_ends_at,
    reservation.waba_id,
    ledger_classification
  )
  on conflict (account_id, period_starts_at, waba_id)
    do nothing;

  insert into public.waba_account_history (
    account_id,
    waba_id,
    first_connected_at,
    last_connected_at,
    last_disconnected_at
  )
  values (
    reservation.account_id,
    reservation.waba_id,
    now(),
    now(),
    null
  )
  on conflict (account_id, waba_id) do update
  set last_connected_at = now(),
      last_disconnected_at = null;

  return new;
end;
$$;

-- Enforcement trigger is activated by migration 040.

create or replace function public.record_waba_disconnection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.waba_id is not null
     and not exists (
       select 1
       from public.whatsapp_config
       where account_id = old.account_id
         and btrim(waba_id) = btrim(old.waba_id)
     ) then
    update public.waba_account_history
    set last_disconnected_at = now()
    where account_id = old.account_id
      and waba_id = btrim(old.waba_id);
  end if;

  return old;
end;
$$;

-- Disconnection trigger is activated by migration 040.

revoke all on function public.reserve_waba_connection(
  uuid,
  text,
  integer,
  integer,
  timestamptz,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.reserve_waba_connection(
  uuid,
  text,
  integer,
  integer,
  timestamptz,
  timestamptz
) to service_role;

revoke all on function public.consume_waba_reservation()
  from public, anon, authenticated;

revoke all on function public.record_waba_disconnection()
  from public, anon, authenticated;

comment on table public.waba_account_history is
  'Permanent WABA identity history; deleting whatsapp_config never resets replacement eligibility.';

comment on table public.waba_quota_ledger is
  'Consumed WABA identities and replacement usage for each subscription period.';

comment on table public.waba_connection_reservations is
  'Short-lived server-authorized reservations consumed atomically by whatsapp_config writes.';
