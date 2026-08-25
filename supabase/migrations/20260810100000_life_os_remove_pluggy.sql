-- Life OS — Reverte a integração Pluggy/Open Finance (conectar Nubank).
-- Desfaz por completo a migration 20260805100000_life_os_pluggy_bancos.sql
-- (removida do histórico junto com esta): apaga os dados importados e as
-- colunas/tabela que só existiam pra essa integração.

delete from public.transacoes where origem = 'pluggy';
delete from public.contas_financeiras where origem = 'pluggy';

alter table public.transacoes
  drop column if exists connection_id,
  drop column if exists pluggy_transaction_id,
  drop column if exists origem,
  drop column if exists categoria_pluggy;

alter table public.contas_financeiras
  drop column if exists connection_id,
  drop column if exists pluggy_account_id,
  drop column if exists origem,
  drop column if exists subtype_pluggy;

drop table if exists public.bank_connections;
