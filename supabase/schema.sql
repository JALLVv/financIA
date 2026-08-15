-- ============================================================
-- Finanzas — esquema social: amigos, listas compartidas,
-- notificaciones y tiempo real.
-- Ejecutar COMPLETO una sola vez en el SQL Editor de Supabase.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------------- perfiles ----------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null default '',
  photo text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update" on public.profiles
  for update to authenticated using (id = auth.uid());

-- perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------- amistades ----------------
-- una fila por pareja (user_lo < user_hi): al borrarla desaparece para ambos
create table if not exists public.friendships (
  user_lo uuid not null references public.profiles(id) on delete cascade,
  user_hi uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_lo, user_hi),
  check (user_lo < user_hi)
);
alter table public.friendships enable row level security;
create policy "friendships_select" on public.friendships
  for select to authenticated using (auth.uid() in (user_lo, user_hi));
create policy "friendships_delete" on public.friendships
  for delete to authenticated using (auth.uid() in (user_lo, user_hi));

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);
alter table public.friend_requests enable row level security;
create policy "friend_requests_select" on public.friend_requests
  for select to authenticated using (auth.uid() in (from_user, to_user));
create policy "friend_requests_delete" on public.friend_requests
  for delete to authenticated using (auth.uid() in (from_user, to_user));

-- ---------------- listas compartidas ----------------
create table if not exists public.shared_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.list_members (
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
create table if not exists public.shared_categories (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  name text not null,
  emoji text not null,
  color text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.shared_transactions (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  category_id uuid not null references public.shared_categories(id) on delete cascade,
  author uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('expense','income')),
  amount numeric not null check (amount > 0),
  description text not null default '',
  date date not null,
  photo text,
  transfer_id text,
  created_at timestamptz not null default now()
);
create table if not exists public.list_invites (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (list_id, to_user)
);

-- helper security definer para evitar recursión en las políticas
create or replace function public.is_list_member(l uuid, u uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.list_members where list_id = l and user_id = u); $$;

alter table public.shared_lists enable row level security;
alter table public.list_members enable row level security;
alter table public.shared_categories enable row level security;
alter table public.shared_transactions enable row level security;
alter table public.list_invites enable row level security;

create policy "shared_lists_select" on public.shared_lists
  for select to authenticated using (public.is_list_member(id, auth.uid()));
create policy "shared_lists_update" on public.shared_lists
  for update to authenticated using (public.is_list_member(id, auth.uid()));
create policy "shared_lists_delete" on public.shared_lists
  for delete to authenticated using (owner = auth.uid());

create policy "list_members_select" on public.list_members
  for select to authenticated using (public.is_list_member(list_id, auth.uid()));
create policy "list_members_delete" on public.list_members
  for delete to authenticated using (user_id = auth.uid());

create policy "shared_categories_select" on public.shared_categories
  for select to authenticated using (public.is_list_member(list_id, auth.uid()));
create policy "shared_categories_insert" on public.shared_categories
  for insert to authenticated with check (public.is_list_member(list_id, auth.uid()));
create policy "shared_categories_update" on public.shared_categories
  for update to authenticated using (public.is_list_member(list_id, auth.uid()));
create policy "shared_categories_delete" on public.shared_categories
  for delete to authenticated using (public.is_list_member(list_id, auth.uid()));

create policy "shared_transactions_select" on public.shared_transactions
  for select to authenticated using (public.is_list_member(list_id, auth.uid()));
create policy "shared_transactions_insert" on public.shared_transactions
  for insert to authenticated with check (public.is_list_member(list_id, auth.uid()) and author = auth.uid());
create policy "shared_transactions_update" on public.shared_transactions
  for update to authenticated using (public.is_list_member(list_id, auth.uid()));
create policy "shared_transactions_delete" on public.shared_transactions
  for delete to authenticated using (public.is_list_member(list_id, auth.uid()));

create policy "list_invites_select" on public.list_invites
  for select to authenticated using (auth.uid() in (from_user, to_user));
create policy "list_invites_delete" on public.list_invites
  for delete to authenticated using (auth.uid() in (from_user, to_user));

-- ---------------- notificaciones ----------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null, -- movement | friend_request | list_invite
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications_select" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications_update" on public.notifications
  for update to authenticated using (user_id = auth.uid());
create policy "notifications_delete" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions_all" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------- funciones RPC ----------------

-- enviar solicitud de amistad por correo
create or replace function public.send_friend_request(target_email text)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  target uuid;
  rid uuid;
  me_name text; me_photo text;
begin
  if me is null then return 'auth'; end if;
  select id into target from profiles where email = lower(trim(target_email));
  if target is null then return 'not_found'; end if;
  if target = me then return 'self'; end if;
  if exists (select 1 from friendships where user_lo = least(me, target) and user_hi = greatest(me, target)) then
    return 'already_friends';
  end if;
  if exists (select 1 from friend_requests where from_user = me and to_user = target) then
    return 'already_sent';
  end if;
  if exists (select 1 from friend_requests where from_user = target and to_user = me) then
    return 'incoming_exists';
  end if;
  select name, photo into me_name, me_photo from profiles where id = me;
  insert into friend_requests (from_user, to_user) values (me, target) returning id into rid;
  insert into notifications (user_id, kind, payload) values (target, 'friend_request',
    jsonb_build_object('request_id', rid,
      'from', jsonb_build_object('id', me, 'name', me_name, 'photo', me_photo)));
  return 'ok';
end $$;

-- aceptar o rechazar una solicitud de amistad
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

-- eliminar amistad (desaparece para ambos)
create or replace function public.remove_friend(friend_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from friendships
    where user_lo = least(auth.uid(), friend_id)
      and user_hi = greatest(auth.uid(), friend_id);
end $$;

-- crear lista compartida con categorías por defecto
create or replace function public.create_shared_list(list_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  lid uuid;
begin
  if me is null then raise exception 'No autenticado'; end if;
  insert into shared_lists (name, owner) values (list_name, me) returning id into lid;
  insert into list_members (list_id, user_id) values (lid, me);
  insert into shared_categories (list_id, name, emoji, color) values
    (lid, 'Comida', '🍔', '#FF9F0A'),
    (lid, 'Transporte', '🚗', '#0A84FF'),
    (lid, 'Hogar', '🏠', '#AC8E68'),
    (lid, 'Compras', '🛍️', '#FF6482'),
    (lid, 'Salud', '💊', '#FF453A'),
    (lid, 'Sueldo', '💼', '#98989F');
  return lid;
end $$;

-- invitar a un amigo a una lista compartida
create or replace function public.invite_to_list(target_list uuid, friend_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  iid uuid;
  me_name text; me_photo text; lname text;
begin
  if me is null then return 'auth'; end if;
  if not is_list_member(target_list, me) then return 'not_member'; end if;
  if not exists (select 1 from friendships where user_lo = least(me, friend_id) and user_hi = greatest(me, friend_id)) then
    return 'not_friends';
  end if;
  if is_list_member(target_list, friend_id) then return 'already_member'; end if;
  if exists (select 1 from list_invites where list_id = target_list and to_user = friend_id) then
    return 'already_invited';
  end if;
  select name, photo into me_name, me_photo from profiles where id = me;
  select name into lname from shared_lists where id = target_list;
  insert into list_invites (list_id, from_user, to_user) values (target_list, me, friend_id) returning id into iid;
  insert into notifications (user_id, kind, payload) values (friend_id, 'list_invite',
    jsonb_build_object('invite_id', iid, 'list_id', target_list, 'list_name', lname,
      'from', jsonb_build_object('id', me, 'name', me_name, 'photo', me_photo)));
  return 'ok';
end $$;

-- aceptar o rechazar una invitación a lista compartida
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

-- salir de una lista (si eres dueño, se elimina para todos)
create or replace function public.leave_shared_list(target_list uuid)
returns void language plpgsql security definer set search_path = public as $$
declare own uuid;
begin
  select owner into own from shared_lists where id = target_list;
  if own = auth.uid() then
    delete from shared_lists where id = target_list;
  else
    delete from list_members where list_id = target_list and user_id = auth.uid();
  end if;
end $$;

-- ---------------- notificar movimientos ----------------
create or replace function public.notify_shared_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare author_name text; lname text;
begin
  select coalesce(nullif(name, ''), email) into author_name from profiles where id = new.author;
  select name into lname from shared_lists where id = new.list_id;
  insert into notifications (user_id, kind, payload)
  select m.user_id, 'movement',
    jsonb_build_object('tx_id', new.id, 'list_id', new.list_id, 'list_name', lname,
      'author', jsonb_build_object('id', new.author, 'name', author_name),
      'description', new.description, 'amount', new.amount, 'type', new.type)
  from list_members m
  where m.list_id = new.list_id and m.user_id <> new.author;
  return new;
end $$;

drop trigger if exists on_shared_transaction_insert on public.shared_transactions;
create trigger on_shared_transaction_insert
  after insert on public.shared_transactions
  for each row execute function public.notify_shared_transaction();

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

-- ---------------- tiempo real ----------------
alter publication supabase_realtime add table
  public.notifications, public.shared_transactions, public.shared_categories,
  public.shared_lists, public.list_members, public.friendships,
  public.friend_requests, public.profiles;

-- ============================================================
-- Todas las listas viven en la cuenta
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
