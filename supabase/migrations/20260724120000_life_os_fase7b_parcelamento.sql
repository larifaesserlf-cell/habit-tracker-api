-- Life OS — Fase 7b: suporte a compras parceladas em transacoes
-- Cada parcela vira sua própria linha em transacoes, todas compartilhando
-- o mesmo compra_id. total_parcelas/parcela_atual identificam a posição
-- de cada linha dentro do parcelamento (1/1 = transação avulsa, não parcelada).

alter table public.transacoes
  add column if not exists total_parcelas int not null default 1,
  add column if not exists parcela_atual int not null default 1,
  add column if not exists compra_id uuid not null default gen_random_uuid();

alter table public.transacoes
  add constraint transacoes_total_parcelas_check check (total_parcelas >= 1),
  add constraint transacoes_parcela_atual_check check (parcela_atual >= 1 and parcela_atual <= total_parcelas);

create index if not exists transacoes_compra_id_idx on public.transacoes (compra_id);
