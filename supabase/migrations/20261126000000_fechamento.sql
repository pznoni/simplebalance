-- Preferências do usuário: por enquanto, o dia de fechamento do mês.
-- dia_fechamento null = mês do calendário; com 20, "Novembro" vai de 21/out a 20/nov.

create table public.preferencias (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  dia_fechamento smallint check (dia_fechamento between 1 and 31),
  updated_at timestamptz not null default now()
);

create trigger preferencias_touch before update on public.preferencias
  for each row execute function public.touch_updated_at();

alter table public.preferencias enable row level security;

create policy "preferencias do dono" on public.preferencias
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- API: só usuários logados, e o cliente só grava o dia de fechamento.
revoke all on public.preferencias from anon, authenticated;
grant select, delete on public.preferencias to authenticated;
grant insert (dia_fechamento), update (dia_fechamento) on public.preferencias to authenticated;
