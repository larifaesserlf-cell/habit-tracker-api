-- Life OS — Fase 7: Financeiro (contas, transações, investimentos, orçamento)
-- Cria as tabelas contas_financeiras, transacoes, investimentos e
-- orcamento_mensal, todas com RLS por usuário. orcamento_mensal ainda não
-- tem tela própria nesta fase — a tabela existe pra uso futuro.

create table if not exists public.contas_financeiras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('corrente', 'poupanca', 'carteira', 'corretora')),
  saldo_atual numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists contas_financeiras_user_id_idx on public.contas_financeiras (user_id);

alter table public.contas_financeiras enable row level security;

create policy "contas_financeiras_select_own" on public.contas_financeiras
  for select using (auth.uid() = user_id);

create policy "contas_financeiras_insert_own" on public.contas_financeiras
  for insert with check (auth.uid() = user_id);

create policy "contas_financeiras_update_own" on public.contas_financeiras
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "contas_financeiras_delete_own" on public.contas_financeiras
  for delete using (auth.uid() = user_id);


create table if not exists public.transacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conta_id uuid not null references public.contas_financeiras (id) on delete cascade,
  tipo text not null check (tipo in ('receita', 'despesa')),
  categoria text not null,
  subcategoria text,
  valor numeric not null,
  data date not null,
  descricao text,
  fixo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists transacoes_user_id_idx on public.transacoes (user_id);
create index if not exists transacoes_conta_id_idx on public.transacoes (conta_id);
create index if not exists transacoes_data_idx on public.transacoes (data);

alter table public.transacoes enable row level security;

create policy "transacoes_select_own" on public.transacoes
  for select using (auth.uid() = user_id);

create policy "transacoes_insert_own" on public.transacoes
  for insert with check (auth.uid() = user_id);

create policy "transacoes_update_own" on public.transacoes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transacoes_delete_own" on public.transacoes
  for delete using (auth.uid() = user_id);


create table if not exists public.investimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo_ativo text not null check (tipo_ativo in (
    'tesouro_ipca', 'tesouro_selic', 'etf', 'acao', 'renda_fixa_banco',
    'reserva_emergencia', 'outro'
  )),
  nome_ativo text not null,
  valor_aportado numeric not null,
  data_aporte date not null,
  instituicao text,
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists investimentos_user_id_idx on public.investimentos (user_id);
create index if not exists investimentos_tipo_ativo_idx on public.investimentos (tipo_ativo);

alter table public.investimentos enable row level security;

create policy "investimentos_select_own" on public.investimentos
  for select using (auth.uid() = user_id);

create policy "investimentos_insert_own" on public.investimentos
  for insert with check (auth.uid() = user_id);

create policy "investimentos_update_own" on public.investimentos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "investimentos_delete_own" on public.investimentos
  for delete using (auth.uid() = user_id);


create table if not exists public.orcamento_mensal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  categoria text not null,
  mes_referencia date not null, -- convenção: sempre o dia 1 do mês (ex: 2026-08-01)
  valor_limite numeric not null
);

create index if not exists orcamento_mensal_user_id_idx on public.orcamento_mensal (user_id);

alter table public.orcamento_mensal enable row level security;

create policy "orcamento_mensal_select_own" on public.orcamento_mensal
  for select using (auth.uid() = user_id);

create policy "orcamento_mensal_insert_own" on public.orcamento_mensal
  for insert with check (auth.uid() = user_id);

create policy "orcamento_mensal_update_own" on public.orcamento_mensal
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "orcamento_mensal_delete_own" on public.orcamento_mensal
  for delete using (auth.uid() = user_id);
