-- Life OS — Treino: registro simples de sessões de academia, mesmo espírito
-- "bloco de notas" do Ciclo Menstrual. RLS por user_id, seguindo o mesmo
-- padrão já usado no resto do projeto.

create table public.treinos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  data date not null,
  nome text not null,
  created_at timestamptz not null default now()
);

create index treinos_user_id_idx on public.treinos (user_id);
create index treinos_data_idx on public.treinos (data);

-- Dedupe de importação: a mesma sessão nunca deve ser inserida duas vezes
-- pra uma mesma usuária. O número do treino (ex: "Treino 16") se repete ao
-- longo do tempo de propósito (é a mesma ficha evoluindo), então só a
-- combinação (data, nome) identifica uma sessão de forma única.
create unique index treinos_user_data_nome_idx on public.treinos (user_id, data, nome);

alter table public.treinos enable row level security;

create policy "treinos_select_own" on public.treinos
  for select using (auth.uid() = user_id);

create policy "treinos_insert_own" on public.treinos
  for insert with check (auth.uid() = user_id);

create policy "treinos_update_own" on public.treinos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "treinos_delete_own" on public.treinos
  for delete using (auth.uid() = user_id);


create table public.exercicios_treino (
  id uuid primary key default gen_random_uuid(),
  treino_id uuid not null references public.treinos (id) on delete cascade,
  nome text not null,
  -- Séries x repetições (ex: "4x12") e carga sempre em texto: a carga vem em
  -- formatos variados demais pra numérico ("50kg", "55+55" peso por lado,
  -- "Barra", "Livre", "2.5+2.5" decimal) — importar como está, sem converter.
  series_reps text,
  carga text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index exercicios_treino_treino_id_idx on public.exercicios_treino (treino_id);

alter table public.exercicios_treino enable row level security;

-- exercicios_treino não tem user_id próprio — a posse é sempre via o treino
-- pai (mesmo padrão de destinos/transportes -> viagens: tabela filha
-- restrita pela dona do registro pai).
create policy "exercicios_treino_select_own" on public.exercicios_treino
  for select using (
    exists (select 1 from public.treinos where treinos.id = exercicios_treino.treino_id and treinos.user_id = auth.uid())
  );

create policy "exercicios_treino_insert_own" on public.exercicios_treino
  for insert with check (
    exists (select 1 from public.treinos where treinos.id = exercicios_treino.treino_id and treinos.user_id = auth.uid())
  );

create policy "exercicios_treino_update_own" on public.exercicios_treino
  for update using (
    exists (select 1 from public.treinos where treinos.id = exercicios_treino.treino_id and treinos.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.treinos where treinos.id = exercicios_treino.treino_id and treinos.user_id = auth.uid())
  );

create policy "exercicios_treino_delete_own" on public.exercicios_treino
  for delete using (
    exists (select 1 from public.treinos where treinos.id = exercicios_treino.treino_id and treinos.user_id = auth.uid())
  );
