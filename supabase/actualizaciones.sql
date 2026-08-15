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

-- 2026-07-06: enlace entre los dos movimientos de una transferencia
-- (al borrar uno se borra el otro desde la app)
alter table public.shared_transactions add column if not exists transfer_id text;

-- ============================================================
-- 2026-08-09: TODAS las listas viven en la cuenta
--
-- Hasta ahora las listas privadas sólo existían en el dispositivo. Con esto
-- cada lista es una fila de shared_lists: "privada" significa simplemente que
-- eres el único miembro. Así, al iniciar sesión en otro dispositivo o tras
-- reinstalar, vuelve todo: listas, categorías, movimientos y repeticiones.
-- ============================================================

-- marca de lista privada (nadie más invitado)
alter table public.shared_lists add column if not exists private boolean not null default false;

-- ajustes y lista activa, para que también viajen con la cuenta
alter table public.profiles add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists active_list uuid;

-- ---------------- transacciones recurrentes ----------------
-- Son del usuario, no de la lista: sólo tus dispositivos las ven, y así se
-- mantiene la regla de que las repeticiones de una lista compartida no se
-- dupliquen entre miembros.
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  category_id uuid references public.shared_categories(id) on delete cascade,
  to_list_id uuid references public.shared_lists(id) on delete cascade,
  type text not null,
  amount numeric not null check (amount > 0),
  description text not null default '',
  frequency text not null,
  start_date date not null,
  next_date date not null,
  created_at timestamptz not null default now()
);
alter table public.recurring_rules enable row level security;
drop policy if exists "recurring_all" on public.recurring_rules;
create policy "recurring_all" on public.recurring_rules
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- ---------------- crear lista (privada o compartida) ----------------
drop function if exists public.create_shared_list(text);
create or replace function public.create_shared_list(
  list_name text, is_private boolean default false, with_defaults boolean default true
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  lid uuid;
begin
  if me is null then raise exception 'No autenticado'; end if;
  insert into shared_lists (name, owner, private) values (list_name, me, is_private) returning id into lid;
  insert into list_members (list_id, user_id) values (lid, me);
  if with_defaults then
    insert into shared_categories (list_id, name, emoji, color) values
      (lid, 'Comida', '🍔', '#D99A47'),
      (lid, 'Transporte', '🚗', '#5B90C9'),
      (lid, 'Hogar', '🏠', '#A88E6E'),
      (lid, 'Compras', '🛍️', '#D0798E'),
      (lid, 'Salud', '💊', '#D66A62'),
      (lid, 'Sueldo', '💼', '#9A9AA4');
  end if;
  return lid;
end $$;

-- al aceptar una invitación la lista deja de ser privada
create or replace function public.respond_list_invite(invite_id uuid, accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  delete from notifications
    where user_id = auth.uid() and kind = 'list_invite'
      and payload->>'invite_id' = invite_id::text;
  select * into r from list_invites where id = invite_id and to_user = auth.uid();
  if not found then return; end if;
  if accept then
    insert into list_members (list_id, user_id) values (r.list_id, auth.uid()) on conflict do nothing;
    update shared_lists set private = false where id = r.list_id;
  end if;
  delete from list_invites where id = invite_id;
end $$;

-- ---------------- subida de los datos que ya había en el dispositivo ----------------
-- Se ejecuta una sola vez al iniciar sesión. Va en una única transacción, así
-- que o sube todo o no sube nada, y devuelve cuántas listas subió.
create or replace function public.import_local_data(payload jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  l jsonb; c jsonb; t jsonb; r jsonb;
  lid uuid; cid uuid;
  lmap jsonb := '{}'::jsonb;
  cmap jsonb := '{}'::jsonb;
  n integer := 0;
begin
  if me is null then raise exception 'No autenticado'; end if;

  for l in select value from jsonb_array_elements(coalesce(payload->'lists', '[]'::jsonb)) loop
    insert into shared_lists (name, owner, private) values (l->>'name', me, true) returning id into lid;
    insert into list_members (list_id, user_id) values (lid, me);
    lmap := lmap || jsonb_build_object(l->>'id', lid::text);
    n := n + 1;
  end loop;

  for c in select value from jsonb_array_elements(coalesce(payload->'categories', '[]'::jsonb)) loop
    lid := nullif(lmap->>(c->>'listId'), '')::uuid;
    if lid is not null then
      insert into shared_categories (list_id, name, emoji, color)
        values (lid, c->>'name', c->>'emoji', c->>'color') returning id into cid;
      cmap := cmap || jsonb_build_object(c->>'id', cid::text);
    end if;
  end loop;

  for t in select value from jsonb_array_elements(coalesce(payload->'transactions', '[]'::jsonb)) loop
    lid := nullif(lmap->>(t->>'listId'), '')::uuid;
    cid := nullif(cmap->>(t->>'categoryId'), '')::uuid;
    -- se saltan los sueltos (importe no positivo o sin fecha) en vez de
    -- abortar la subida entera por una fila estropeada
    if lid is not null and cid is not null
       and coalesce((t->>'amount')::numeric, 0) > 0 and nullif(t->>'date', '') is not null then
      insert into shared_transactions
        (list_id, category_id, author, type, amount, description, date, photo, transfer_id)
      values (lid, cid, me, t->>'type', (t->>'amount')::numeric,
              coalesce(t->>'description', ''), (t->>'date')::date,
              nullif(t->>'photo', ''), nullif(t->>'transferId', ''));
    end if;
  end loop;

  for r in select value from jsonb_array_elements(coalesce(payload->'recurring', '[]'::jsonb)) loop
    lid := nullif(lmap->>(r->>'listId'), '')::uuid;
    if lid is not null and coalesce((r->>'amount')::numeric, 0) > 0
       and nullif(coalesce(r->>'nextDate', r->>'startDate'), '') is not null then
      insert into recurring_rules
        (owner, list_id, category_id, to_list_id, type, amount, description, frequency, start_date, next_date)
      values (me, lid, nullif(cmap->>(r->>'categoryId'), '')::uuid, nullif(lmap->>(r->>'toListId'), '')::uuid,
              r->>'type', (r->>'amount')::numeric, coalesce(r->>'description', ''), r->>'frequency',
              coalesce(nullif(r->>'startDate', ''), r->>'nextDate')::date,
              coalesce(nullif(r->>'nextDate', ''), r->>'startDate')::date);
    end if;
  end loop;

  return n;
end $$;

-- ---------------- avance seguro de una repetición ----------------
-- Si dos dispositivos tuyos generan la misma repetición a la vez, sólo uno
-- consigue avanzar la fecha; el otro ve 0 filas y no duplica el movimiento.
create or replace function public.claim_recurring(rule_id uuid, expected date, new_next date)
returns boolean language plpgsql security definer set search_path = public as $$
declare hit integer;
begin
  update recurring_rules set next_date = new_next
    where id = rule_id and owner = auth.uid() and next_date = expected;
  get diagnostics hit = row_count;
  return hit > 0;
end $$;
