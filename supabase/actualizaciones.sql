-- ============================================================
-- Actualizaciones para bases de datos que ya ejecutaron
-- schema.sql. Ejecutar en el SQL Editor de Supabase.
-- (schema.sql ya incluye estos cambios para instalaciones nuevas)
-- ============================================================

-- 2026-07-04: foto adjunta en movimientos compartidos (facturas, recibos…)
alter table public.shared_transactions add column if not exists photo text;

-- 2026-07-05: al responder una solicitud/invitación, la notificación se
-- elimina siempre (antes, si la invitación ya no existía, la notificación
-- rechazada quedaba sin borrar)
create or replace function public.respond_friend_request(request_id uuid, accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  -- la notificación se elimina siempre, aunque la solicitud ya no exista
  delete from notifications
    where user_id = auth.uid() and kind = 'friend_request'
      and payload->>'request_id' = request_id::text;
  select * into r from friend_requests where id = request_id and to_user = auth.uid();
  if not found then return; end if;
  if accept then
    insert into friendships (user_lo, user_hi)
    values (least(r.from_user, r.to_user), greatest(r.from_user, r.to_user))
    on conflict do nothing;
  end if;
  delete from friend_requests where id = request_id;
end $$;

create or replace function public.respond_list_invite(invite_id uuid, accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  -- la notificación se elimina siempre, aunque la invitación ya no exista
  delete from notifications
    where user_id = auth.uid() and kind = 'list_invite'
      and payload->>'invite_id' = invite_id::text;
  select * into r from list_invites where id = invite_id and to_user = auth.uid();
  if not found then return; end if;
  if accept then
    insert into list_members (list_id, user_id) values (r.list_id, auth.uid()) on conflict do nothing;
  end if;
  delete from list_invites where id = invite_id;
end $$;

-- 2026-07-05 (2): al eliminar un movimiento compartido, una invitación o
-- una solicitud, se eliminan también sus notificaciones
-- ------- limpiar notificaciones cuando se elimina lo que las originó -------
create or replace function public.cleanup_tx_notifications()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from notifications where kind = 'movement' and payload->>'tx_id' = old.id::text;
  return old;
end $$;
drop trigger if exists on_shared_transaction_delete on public.shared_transactions;
create trigger on_shared_transaction_delete
  after delete on public.shared_transactions
  for each row execute function public.cleanup_tx_notifications();

create or replace function public.cleanup_invite_notifications()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from notifications where kind = 'list_invite' and payload->>'invite_id' = old.id::text;
  return old;
end $$;
drop trigger if exists on_list_invite_delete on public.list_invites;
create trigger on_list_invite_delete
  after delete on public.list_invites
  for each row execute function public.cleanup_invite_notifications();

create or replace function public.cleanup_request_notifications()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from notifications where kind = 'friend_request' and payload->>'request_id' = old.id::text;
  return old;
end $$;
drop trigger if exists on_friend_request_delete on public.friend_requests;
create trigger on_friend_request_delete
  after delete on public.friend_requests
  for each row execute function public.cleanup_request_notifications();
