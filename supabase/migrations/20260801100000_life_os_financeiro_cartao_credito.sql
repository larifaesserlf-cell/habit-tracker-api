-- Life OS — Financeiro: contas do tipo cartão de crédito, separando a data
-- da compra da data de vencimento da fatura.

alter table public.contas_financeiras drop constraint if exists contas_financeiras_tipo_check;
alter table public.contas_financeiras
  add constraint contas_financeiras_tipo_check
    check (tipo in ('corrente', 'poupanca', 'carteira', 'corretora', 'cartao_credito'));

-- Só preenchida pra contas do tipo cartao_credito.
alter table public.contas_financeiras
  add column if not exists dia_vencimento_fatura int
    check (dia_vencimento_fatura is null or (dia_vencimento_fatura between 1 and 31));

-- Data de vencimento da fatura a que a transação pertence — só preenchida
-- pra transações de contas cartao_credito (calculada ao salvar: mês
-- seguinte ao da compra, no dia_vencimento_fatura da conta).
alter table public.transacoes
  add column if not exists data_fatura date;

create index if not exists transacoes_data_fatura_idx on public.transacoes (data_fatura);
