-- Switch the active WhatsApp connection without colliding with the
-- partial unique index that permits one active connection per account.

create or replace function public.activate_whatsapp_connection(connection_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_account_id uuid;
begin
  select account_id
  into target_account_id
  from public.whatsapp_config
  where id = connection_id
  for update;

  if target_account_id is null then
    raise exception 'WhatsApp connection not found';
  end if;

  perform 1
  from public.whatsapp_config
  where account_id = target_account_id
  order by id
  for update;

  update public.whatsapp_config
  set is_active = false,
      updated_at = now()
  where account_id = target_account_id
    and is_active = true;

  update public.whatsapp_config
  set is_active = true,
      updated_at = now()
  where account_id = target_account_id
    and id = connection_id;

  if not found then
    raise exception 'WhatsApp connection not found';
  end if;
end;
$$;
