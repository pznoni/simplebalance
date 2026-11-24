-- Reforço de segurança.

-- 1) A API só grava as colunas que o app usa. id, user_id, created_at e updated_at
--    vêm dos defaults/gatilhos e não podem ser enviados pelo cliente (evita gravar
--    o corpo inteiro da requisição e forjar dono/datas).
revoke insert, update on public.categorias, public.lancamentos from authenticated;

grant insert (nome, ordem), update (nome, ordem) on public.categorias to authenticated;
grant insert (tipo, valor, descricao, data, categoria_id, pagamento, resolvido),
      update (tipo, valor, descricao, data, categoria_id, pagamento, resolvido)
  on public.lancamentos to authenticated;

-- 2) Limites de valor para dados absurdos (até R$ 1 bilhão; datas plausíveis; ordem pequena).
alter table public.lancamentos
  add constraint lancamentos_valor_max check (valor <= 100000000000),
  add constraint lancamentos_data_faixa check (data between date '2000-01-01' and date '2100-12-31');
alter table public.categorias
  add constraint categorias_ordem_faixa check (ordem between 0 and 10000);

-- 3) Limite de registros por usuário (protege o projeto de uma conta abusiva).
create function public.limitar_registros() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  total integer;
  limite integer;
begin
  if tg_table_name = 'categorias' then
    limite := 200;
    select count(*) into total from public.categorias where user_id = new.user_id;
  else
    limite := 100000;
    select count(*) into total from public.lancamentos where user_id = new.user_id;
  end if;
  if total >= limite then
    raise exception 'Limite de % registros atingido.', limite using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger categorias_limite before insert on public.categorias
  for each row execute function public.limitar_registros();
create trigger lancamentos_limite before insert on public.lancamentos
  for each row execute function public.limitar_registros();

-- 4) Funções com search_path fixo e fora do alcance da API.
alter function public.touch_updated_at() set search_path = '';
revoke execute on function public.touch_updated_at(), public.seed_categorias(), public.limitar_registros()
  from public, anon, authenticated;
