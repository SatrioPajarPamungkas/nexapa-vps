-- Activate WABA quota enforcement only after the CRM application
-- has been deployed with reservation-aware writes.

-- Consume reservations written during the safe rollout window.
update public.waba_connection_reservations as reservation
set consumed_at = coalesce(
  reservation.consumed_at,
  config.created_at,
  now()
)
from public.whatsapp_config as config
where config.waba_reservation_id = reservation.id
  and reservation.cancelled_at is null
  and reservation.account_id = config.account_id
  and reservation.waba_id = btrim(config.waba_id);

insert into public.waba_quota_ledger (
  account_id,
  period_starts_at,
  period_ends_at,
  waba_id,
  classification,
  connected_at
)
select
  reservation.account_id,
  reservation.period_starts_at,
  reservation.period_ends_at,
  reservation.waba_id,
  case
    when reservation.classification = 'existing'
      then 'reconnect'
    else reservation.classification
  end,
  coalesce(reservation.consumed_at, now())
from public.waba_connection_reservations as reservation
join public.whatsapp_config as config
  on config.waba_reservation_id = reservation.id
where reservation.consumed_at is not null
on conflict (account_id, period_starts_at, waba_id)
  do nothing;

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
  max(coalesce(
    config.connected_at,
    config.created_at,
    now()
  ))
from public.whatsapp_config as config
where config.waba_id is not null
  and btrim(config.waba_id) <> ''
group by config.account_id, btrim(config.waba_id)
on conflict (account_id, waba_id) do update
set last_connected_at = greatest(
  public.waba_account_history.last_connected_at,
  excluded.last_connected_at
);

drop trigger if exists enforce_waba_reservation
  on public.whatsapp_config;

create trigger enforce_waba_reservation
before insert or update of account_id, waba_id
on public.whatsapp_config
for each row
execute function public.consume_waba_reservation();

drop trigger if exists record_waba_disconnection
  on public.whatsapp_config;

create trigger record_waba_disconnection
after delete on public.whatsapp_config
for each row
execute function public.record_waba_disconnection();
