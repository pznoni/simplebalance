-- simplebalance: categorias e lançamentos, um conjunto por usuário (RLS).

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 40),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('fixo', 'variavel')),
  valor bigint not null check (valor > 0),          -- centavos
  descricao text not null check (length(trim(descricao)) between 1 and 80),
  data date not null,                               -- em "fixo" é o vencimento
  categoria_id uuid references public.categorias (id) on delete set null,
  pagamento text not null check (pagamento in ('credito', 'debito')),
  resolvido boolean not null default false,         -- crédito: caiu / débito: pago
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lancamentos_user_data_idx on public.lancamentos (user_id, data);

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger lancamentos_touch before update on public.lancamentos
  for each row execute function public.touch_updated_at();

-- Acesso pela API só para usuários logados (independe do "auto-grant" do projeto).
revoke all on public.categorias, public.lancamentos from anon;
grant select, insert, update, delete on public.categorias, public.lancamentos to authenticated;

-- RLS: cada um só vê e altera o que é seu.
alter table public.categorias enable row level security;
alter table public.lancamentos enable row level security;

create policy "categorias do dono" on public.categorias
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "lancamentos do dono" on public.lancamentos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (categoria_id is null or exists (
      select 1 from public.categorias c
      where c.id = categoria_id and c.user_id = (select auth.uid())
    ))
  );

-- Categorias padrão para cada usuário novo.
create function public.seed_categorias() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.categorias (user_id, nome, ordem)
  select new.id, nome, ordem
  from unnest(array['Moradia', 'Mercado', 'Transporte', 'Saúde', 'Lazer', 'Assinaturas', 'Outros'])
       with ordinality as t(nome, ordem);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.seed_categorias();
