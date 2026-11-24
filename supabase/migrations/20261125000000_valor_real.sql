-- Valor real: o que de fato caiu/foi pago. `valor` continua sendo o previsto.
-- null = igual ao previsto (lançamentos antigos e resolvidos sem diferença).

alter table public.lancamentos
  add column valor_real bigint
    constraint lancamentos_valor_real_faixa check (valor_real is null or valor_real between 1 and 100000000000);

-- A API só grava colunas liberadas uma a uma (ver 20261124000000_hardening.sql).
grant insert (valor_real), update (valor_real) on public.lancamentos to authenticated;
