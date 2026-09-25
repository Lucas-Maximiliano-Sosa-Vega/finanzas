-- =============================================================================
-- Finanzas personales · esquema inicial
--
-- Modelo:
--   auth.users 1─1 profiles        (preferencias: moneda, zona horaria, día de cobro, regla 50/30/20)
--   auth.users 1─N accounts        (Efectivo, Tarjeta de crédito, Cuenta bancaria…)
--   auth.users 1─N categories      (jerarquía de 1 nivel: categoría → subcategoría)
--   auth.users 1─N transactions    (cada una sale/entra de una cuenta y pertenece a una categoría)
--   auth.users 1─N budgets         (globales o por categoría; recurrentes o de un ciclo concreto)
--
-- El "mes" financiero es el ciclo de cobro: del día de cobro (25) al día 24
-- del mes siguiente. Así los ingresos del mes existen desde el primer día del
-- periodo y las alertas del 50/30/20 no se disparan antes de cobrar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.transaction_kind as enum ('income', 'expense');

-- needs = 50 % esenciales · wants = 30 % flexibles · savings = 20 % ahorro/inversión
create type public.rule_bucket as enum ('needs', 'wants', 'savings');

create type public.account_type as enum (
  'cash', 'checking', 'savings', 'credit_card', 'debit_card', 'digital_wallet', 'investment'
);

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  currency            char(3)      not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  timezone            text         not null default 'UTC',
  payday              smallint     not null default 25 check (payday between 1 and 28),
  needs_pct           numeric(5,2) not null default 50 check (needs_pct >= 0),
  wants_pct           numeric(5,2) not null default 30 check (wants_pct >= 0),
  savings_pct         numeric(5,2) not null default 20 check (savings_pct >= 0),
  -- % de uso del límite a partir del cual se emite una alerta preventiva
  alert_threshold_pct smallint     not null default 85 check (alert_threshold_pct between 50 and 100),
  created_at          timestamptz  not null default now(),
  constraint profiles_rule_sums_100 check (needs_pct + wants_pct + savings_pct = 100)
);

-- -----------------------------------------------------------------------------
-- accounts (cuentas / billeteras)
-- -----------------------------------------------------------------------------
create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 60),
  type            public.account_type not null,
  initial_balance numeric(14,2) not null default 0,
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (user_id, name)
);

-- -----------------------------------------------------------------------------
-- categories (un nivel de subcategorías vía parent_id)
-- -----------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id  uuid references public.categories (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  kind       public.transaction_kind not null,
  -- Bloque 50/30/20. Obligatorio en gastos, nulo en ingresos.
  bucket     public.rule_bucket,
  -- Tope opcional como % de los ingresos del ciclo (alertas por categoría).
  target_pct numeric(5,2) check (target_pct > 0 and target_pct <= 100),
  color      text check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  constraint categories_bucket_matches_kind check ((kind = 'expense') = (bucket is not null)),
  constraint categories_target_only_expense check (target_pct is null or kind = 'expense'),
  constraint categories_not_own_parent check (parent_id <> id),
  unique nulls not distinct (user_id, parent_id, name)
);

create index categories_user_idx   on public.categories (user_id);
create index categories_parent_idx on public.categories (parent_id);

-- -----------------------------------------------------------------------------
-- transactions
-- -----------------------------------------------------------------------------
create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id  uuid not null references public.accounts (id) on delete restrict,
  -- restrict: no se puede borrar una categoría con movimientos (protege el histórico).
  category_id uuid not null references public.categories (id) on delete restrict,
  -- Se copia de la categoría mediante trigger; no hace falta enviarlo.
  kind        public.transaction_kind not null,
  amount      numeric(14,2) not null check (amount > 0),
  occurred_on date not null default current_date,
  description text check (char_length(description) <= 200),
  created_at  timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_category_idx  on public.transactions (category_id);
create index transactions_account_idx   on public.transactions (account_id);

-- -----------------------------------------------------------------------------
-- budgets
--   category_id nulo  → presupuesto global de gasto (esenciales + flexibles)
--   period_start nulo → recurrente: aplica a todos los ciclos salvo que exista
--                       uno específico para ese ciclo
-- -----------------------------------------------------------------------------
create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id  uuid references public.categories (id) on delete cascade,
  period_start date,
  amount       numeric(14,2) not null check (amount > 0),
  created_at   timestamptz not null default now(),
  unique nulls not distinct (user_id, category_id, period_start)
);

create index budgets_category_idx on public.budgets (category_id);

-- =============================================================================
-- Integridad (las FK no comprueban propiedad: una fila podría apuntar a la
-- categoría de otro usuario sin estos triggers)
-- =============================================================================
create function public.enforce_category_hierarchy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent public.categories%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into parent from public.categories where id = new.parent_id;

  if not found or parent.user_id <> new.user_id then
    raise exception 'Categoría padre inválida';
  end if;
  if parent.parent_id is not null
     or exists (select 1 from public.categories where parent_id = new.id) then
    raise exception 'Solo se admite un nivel de subcategorías';
  end if;
  if parent.kind <> new.kind then
    raise exception 'La subcategoría debe ser del mismo tipo que su categoría padre';
  end if;

  -- Por defecto hereda el bloque del padre, pero puede tener uno propio
  -- (p. ej. Comida → Supermercado = esencial, Restaurantes = flexible).
  new.bucket := coalesce(new.bucket, parent.bucket);
  return new;
end;
$$;

create trigger categories_hierarchy
  before insert or update of parent_id, kind, bucket on public.categories
  for each row execute function public.enforce_category_hierarchy();

create function public.enforce_transaction_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  category_kind public.transaction_kind;
begin
  select kind into category_kind
  from public.categories
  where id = new.category_id and user_id = new.user_id;

  if not found then
    raise exception 'Categoría inválida';
  end if;
  if not exists (select 1 from public.accounts where id = new.account_id and user_id = new.user_id) then
    raise exception 'Cuenta inválida';
  end if;

  new.kind := category_kind;
  return new;
end;
$$;

create trigger transactions_integrity
  before insert or update of category_id, account_id, user_id on public.transactions
  for each row execute function public.enforce_transaction_integrity();

create function public.enforce_budget_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  payday smallint;
begin
  if new.category_id is not null and not exists (
    select 1 from public.categories
    where id = new.category_id and user_id = new.user_id and kind = 'expense'
  ) then
    raise exception 'Los presupuestos solo aplican a categorías de gasto propias';
  end if;

  if new.period_start is not null then
    select p.payday into payday from public.profiles p where p.id = new.user_id;
    if extract(day from new.period_start) <> payday then
      raise exception 'period_start debe coincidir con el día de cobro';
    end if;
  end if;

  return new;
end;
$$;

create trigger budgets_integrity
  before insert or update on public.budgets
  for each row execute function public.enforce_budget_integrity();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles     enable row level security;
alter table public.accounts     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;

-- (select auth.uid()) se evalúa una vez por consulta, no por fila.
create policy "profiles: leer el propio"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: editar el propio"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "accounts: propias"
  on public.accounts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "categories: propias"
  on public.categories for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "transactions: propias"
  on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "budgets: propios"
  on public.budgets for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- =============================================================================
-- Agregaciones en la base de datos (una sola ida y vuelta, usa índices)
-- =============================================================================

-- Inicio del ciclo de cobro que contiene p_date.
create function public.pay_cycle_start(p_date date, p_payday int)
returns date
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when extract(day from p_date) >= p_payday
      then make_date(extract(year from p_date)::int, extract(month from p_date)::int, p_payday)
    else (make_date(extract(year from p_date)::int, extract(month from p_date)::int, p_payday)
          - interval '1 month')::date
  end;
$$;

-- Totales 50/30/20 agrupados por ciclo de cobro dentro de [p_from, p_to].
create function public.cycle_rule_totals(p_from date, p_to date)
returns table (cycle_start date, income numeric, needs numeric, wants numeric, savings numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    public.pay_cycle_start(t.occurred_on, p.payday)                           as cycle_start,
    coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)               as income,
    coalesce(sum(t.amount) filter (where c.bucket = 'needs'), 0)              as needs,
    coalesce(sum(t.amount) filter (where c.bucket = 'wants'), 0)              as wants,
    coalesce(sum(t.amount) filter (where c.bucket = 'savings'), 0)            as savings
  from public.transactions t
  join public.categories c on c.id = t.category_id
  join public.profiles   p on p.id = t.user_id
  where t.user_id = (select auth.uid())
    and t.occurred_on between p_from and p_to
  group by 1
  order by 1;
$$;

-- Gasto por categoría (hoja) dentro de [p_from, p_to].
create function public.category_spending(p_from date, p_to date)
returns table (category_id uuid, spent numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.category_id, sum(t.amount) as spent
  from public.transactions t
  where t.user_id = (select auth.uid())
    and t.kind = 'expense'
    and t.occurred_on between p_from and p_to
  group by t.category_id;
$$;

revoke execute on function public.cycle_rule_totals(date, date) from public, anon;
revoke execute on function public.category_spending(date, date) from public, anon;
grant  execute on function public.cycle_rule_totals(date, date) to authenticated;
grant  execute on function public.category_spending(date, date) to authenticated;

-- =============================================================================
-- Datos iniciales por usuario (perfil, cuentas y categorías 50/30/20)
-- =============================================================================
create function public.seed_default_data(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  vivienda_id uuid;
begin
  insert into public.profiles (id) values (p_user) on conflict (id) do nothing;

  insert into public.accounts (user_id, name, type) values
    (p_user, 'Efectivo',           'cash'),
    (p_user, 'Cuenta bancaria',    'checking'),
    (p_user, 'Tarjeta de crédito', 'credit_card')
  on conflict do nothing;

  if exists (select 1 from public.categories where user_id = p_user) then
    return;
  end if;

  insert into public.categories (user_id, name, kind, bucket) values
    (p_user, 'Sueldo',         'income',  null),
    (p_user, 'Otros ingresos', 'income',  null),
    (p_user, 'Supermercado',   'expense', 'needs'),
    (p_user, 'Transporte',     'expense', 'needs'),
    (p_user, 'Salud',          'expense', 'needs'),
    (p_user, 'Salidas',        'expense', 'wants'),
    (p_user, 'Ocio',           'expense', 'wants'),
    (p_user, 'Suscripciones',  'expense', 'wants'),
    (p_user, 'Ahorro',         'expense', 'savings'),
    (p_user, 'Inversión',      'expense', 'savings');

  insert into public.categories (user_id, name, kind, bucket)
  values (p_user, 'Vivienda', 'expense', 'needs')
  returning id into vivienda_id;

  insert into public.categories (user_id, parent_id, name, kind) values
    (p_user, vivienda_id, 'Alquiler',  'expense'),
    (p_user, vivienda_id, 'Servicios', 'expense');
end;
$$;

revoke execute on function public.seed_default_data(uuid) from public, anon, authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_default_data(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuarios que ya existían antes de esta migración.
select public.seed_default_data(id) from auth.users;

-- =============================================================================
-- Realtime: el dashboard se refresca solo al cambiar estos datos
-- =============================================================================
alter publication supabase_realtime add table public.transactions, public.budgets, public.categories;
