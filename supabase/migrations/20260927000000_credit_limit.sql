-- Límite de crédito de las tarjetas de crédito.
-- La tarjeta funciona como una cuenta propia (no está ligada a la cuenta bancaria):
-- el saldo es negativo cuando se debe, y disponible = límite + saldo.
alter table public.accounts
  add column credit_limit numeric(14,2) check (credit_limit is null or credit_limit > 0);

-- Que la API de Supabase (PostgREST) vea la columna nueva sin esperar.
notify pgrst, 'reload schema';
