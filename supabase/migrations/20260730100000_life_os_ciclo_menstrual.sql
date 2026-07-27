-- Life OS — Ciclo Menstrual (área Saúde)
-- RLS simples por user_id, seguindo o mesmo padrão já usado em habits/areas.

create table public.ciclos_menstruais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  data_inicio date not null,
  data_fim date,
  created_at timestamptz not null default now()
);

create index ciclos_menstruais_user_id_idx on public.ciclos_menstruais (user_id);

-- Só pode existir um ciclo em andamento (data_fim null) por usuária — impede
-- criar um segundo "início" sem fechar o anterior, tanto no app quanto por
-- qualquer acesso direto ao banco.
create unique index ciclos_menstruais_em_andamento_unico_idx
  on public.ciclos_menstruais (user_id)
  where data_fim is null;

alter table public.ciclos_menstruais enable row level security;

create policy "ciclos_menstruais_select_own" on public.ciclos_menstruais
  for select using (auth.uid() = user_id);

create policy "ciclos_menstruais_insert_own" on public.ciclos_menstruais
  for insert with check (auth.uid() = user_id);

create policy "ciclos_menstruais_update_own" on public.ciclos_menstruais
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ciclos_menstruais_delete_own" on public.ciclos_menstruais
  for delete using (auth.uid() = user_id);


create table public.registros_ciclo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  data date not null,
  fluxo text not null default 'nenhum' check (fluxo in ('nenhum', 'leve', 'moderado', 'intenso')),
  tpm boolean not null default false,
  humor text,
  sintomas text[],
  notas text,
  created_at timestamptz not null default now(),
  unique (user_id, data)
);

create index registros_ciclo_user_id_idx on public.registros_ciclo (user_id);
create index registros_ciclo_data_idx on public.registros_ciclo (data);

alter table public.registros_ciclo enable row level security;

create policy "registros_ciclo_select_own" on public.registros_ciclo
  for select using (auth.uid() = user_id);

create policy "registros_ciclo_insert_own" on public.registros_ciclo
  for insert with check (auth.uid() = user_id);

create policy "registros_ciclo_update_own" on public.registros_ciclo
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "registros_ciclo_delete_own" on public.registros_ciclo
  for delete using (auth.uid() = user_id);
