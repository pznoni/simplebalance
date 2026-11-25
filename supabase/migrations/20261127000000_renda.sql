-- Renda mensal do usuário (centavos), para mostrar a sobra: renda − despesas.
alter table public.preferencias
  add column renda_mensal bigint check (renda_mensal between 0 and 100000000000);

grant insert (renda_mensal), update (renda_mensal) on public.preferencias to authenticated;
