-- Saldo actual de cada cuenta: saldo inicial + ingresos − gastos.
create function public.account_balances()
returns table (account_id uuid, balance numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.id,
    a.initial_balance
      + coalesce(sum(case when t.kind = 'income' then t.amount else -t.amount end), 0)
  from public.accounts a
  left join public.transactions t on t.account_id = a.id
  where a.user_id = (select auth.uid())
  group by a.id;
$$;

revoke execute on function public.account_balances() from public, anon;
grant  execute on function public.account_balances() to authenticated;

-- Que la API de Supabase (PostgREST) vea la función nueva sin esperar.
notify pgrst, 'reload schema';
