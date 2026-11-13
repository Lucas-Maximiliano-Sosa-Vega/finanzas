-- =============================================================================
-- Transferencias entre cuentas
--
-- Mover dinero de una cuenta a otra (pagar la tarjeta desde el banco, retirar
-- efectivo, ahorrar…) NO es un gasto ni un ingreso: cambia el saldo de las dos
-- cuentas pero no debe contar en el 50/30/20 ni en los totales del ciclo.
-- =============================================================================
create table public.transfers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  from_account_id uuid not null references public.accounts (id) on delete restrict,
  to_account_id   uuid not null references public.accounts (id) on delete restrict,
  amount          numeric(14,2) not null check (amount > 0),
  occurred_on     date not null default current_date,
  description     text check (char_length(description) <= 200),
  created_at      timestamptz not null default now(),
  constraint transfers_different_accounts check (from_account_id <> to_account_id)
);

create index transfers_user_date_idx on public.transfers (user_id, occurred_on desc);
create index transfers_from_idx      on public.transfers (from_account_id);
create index transfers_to_idx        on public.transfers (to_account_id);

-- Las FK no comprueban propiedad: ambas cuentas deben ser del mismo usuario.
create function public.enforce_transfer_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.accounts
      where id in (new.from_account_id, new.to_account_id) and user_id = new.user_id) <> 2 then
    raise exception 'Cuenta inválida';
  end if;
  return new;
end;
$$;

create trigger transfers_integrity
  before insert or update of from_account_id, to_account_id, user_id on public.transfers
  for each row execute function public.enforce_transfer_integrity();

alter table public.transfers enable row level security;

create policy "transfers: propias"
  on public.transfers for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Saldo actual de cada cuenta:
--   saldo inicial + ingresos − gastos + transferencias recibidas − transferencias enviadas.
create or replace function public.account_balances()
returns table (account_id uuid, balance numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.id,
    a.initial_balance
      + coalesce((select sum(case when t.kind = 'income' then t.amount else -t.amount end)
                  from public.transactions t where t.account_id = a.id), 0)
      + coalesce((select sum(x.amount) from public.transfers x where x.to_account_id = a.id), 0)
      - coalesce((select sum(x.amount) from public.transfers x where x.from_account_id = a.id), 0)
  from public.accounts a
  where a.user_id = (select auth.uid());
$$;

notify pgrst, 'reload schema';
