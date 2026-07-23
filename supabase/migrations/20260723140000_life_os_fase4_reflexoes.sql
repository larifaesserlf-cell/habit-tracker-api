-- Life OS — Fase 4: Reflexões
-- Cria a tabela reflexoes, com RLS por usuário.

create table if not exists public.reflexoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  data date not null default current_date,
  texto text not null,
  humor_opcional int check (humor_opcional between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists reflexoes_user_id_idx on public.reflexoes (user_id);
create index if not exists reflexoes_data_idx on public.reflexoes (data);

alter table public.reflexoes enable row level security;

create policy "reflexoes_select_own" on public.reflexoes
  for select using (auth.uid() = user_id);

create policy "reflexoes_insert_own" on public.reflexoes
  for insert with check (auth.uid() = user_id);

create policy "reflexoes_update_own" on public.reflexoes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reflexoes_delete_own" on public.reflexoes
  for delete using (auth.uid() = user_id);
