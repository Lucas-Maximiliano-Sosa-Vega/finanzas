-- =============================================================================
-- Datos de ejemplo (OPCIONAL): 6 ciclos de movimientos para ver el dashboard.
-- Se aplican al primer usuario de auth.users. Ejecutar desde el SQL Editor.
-- Para borrarlos:  delete from public.transactions where description like '[demo]%';
-- =============================================================================
do $$
declare
  uid     uuid := (select id from auth.users order by created_at limit 1);
  bank    uuid;
  card    uuid;
begin
  if uid is null then
    raise exception 'Crea primero tu usuario en Authentication → Users';
  end if;

  select id into bank from public.accounts where user_id = uid and type = 'checking'    limit 1;
  select id into card from public.accounts where user_id = uid and type = 'credit_card' limit 1;

  insert into public.transactions (user_id, account_id, category_id, amount, occurred_on, description)
  select
    uid,
    case when d.on_card then card else bank end,
    c.id,
    round((d.base * (0.8 + random() * 0.4))::numeric, 2),
    make_date(
      extract(year  from (current_date - make_interval(months => m)))::int,
      extract(month from (current_date - make_interval(months => m)))::int,
      d.day
    ),
    '[demo] ' || d.name
  from generate_series(0, 6) as m
  cross join (values
    ('Sueldo',        3000, 25, false),
    ('Alquiler',       900,  1, false),
    ('Servicios',      160,  5, false),
    ('Supermercado',   320, 10, true),
    ('Transporte',      90, 12, true),
    ('Salidas',        260, 15, true),
    ('Suscripciones',   45,  3, true),
    ('Ocio',           150, 20, true),
    ('Ahorro',         450, 26, false),
    ('Inversión',      150, 26, false)
  ) as d(name, base, day, on_card)
  join public.categories c on c.user_id = uid and c.name = d.name
  where make_date(
      extract(year  from (current_date - make_interval(months => m)))::int,
      extract(month from (current_date - make_interval(months => m)))::int,
      d.day
    ) <= current_date;
end;
$$;
