-- Life OS — Integração Pluggy/Open Finance: conexões bancárias + origem
-- Pluggy em contas_financeiras/transacoes. Reaproveita as duas tabelas já
-- existentes do módulo Financeiro (evita duplicar o conceito de "conta" e
-- "transação") — só bank_connections é conceito novo.

create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pluggy_item_id uuid not null unique,
  institution_name text not null,
  connector_id int,
  status text not null default 'UPDATED',
  consent_expires_at timestamptz,
  last_sync timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bank_connections_user_id_idx on public.bank_connections (user_id);

alter table public.bank_connections enable row level security;

create policy "bank_connections_select_own" on public.bank_connections
  for select using (auth.uid() = user_id);

create policy "bank_connections_insert_own" on public.bank_connections
  for insert with check (auth.uid() = user_id);

create policy "bank_connections_update_own" on public.bank_connections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bank_connections_delete_own" on public.bank_connections
  for delete using (auth.uid() = user_id);


-- Conta vinda de sincronização Pluggy: mesma tabela contas_financeiras,
-- só com colunas extras (todas nulas/manual por padrão, não quebra
-- lançamento manual nenhum já existente).
alter table public.contas_financeiras
  add column if not exists connection_id uuid references public.bank_connections (id) on delete cascade,
  add column if not exists pluggy_account_id uuid,
  add column if not exists origem text not null default 'manual' check (origem in ('manual', 'pluggy')),
  add column if not exists subtype_pluggy text;

-- Sem `where` — Postgres já trata NULL como sempre distinto numa unique
-- constraint, então contas manuais (connection_id/pluggy_account_id nulos)
-- nunca conflitam entre si; só precisa ser um índice "cheio" (sem predicado)
-- pra poder ser usado como alvo de ON CONFLICT no upsert da sincronização.
create unique index if not exists contas_financeiras_connection_pluggy_account_idx
  on public.contas_financeiras (connection_id, pluggy_account_id);


-- Transação vinda de sincronização Pluggy — dedupe por pluggy_transaction_id.
-- categoria/descricao continuam sendo as colunas editáveis pela usuária;
-- categoria_pluggy guarda a sugestão bruta à parte, nunca sobrescrita depois.
alter table public.transacoes
  add column if not exists connection_id uuid references public.bank_connections (id) on delete set null,
  add column if not exists pluggy_transaction_id uuid,
  add column if not exists origem text not null default 'manual' check (origem in ('manual', 'pluggy')),
  add column if not exists categoria_pluggy text;

create unique index if not exists transacoes_pluggy_transaction_id_idx
  on public.transacoes (pluggy_transaction_id)
  where pluggy_transaction_id is not null;
