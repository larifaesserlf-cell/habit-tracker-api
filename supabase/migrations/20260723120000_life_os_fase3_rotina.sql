-- Life OS — Fase 3: Rotina semanal
-- Cria a tabela rotina_diaria, com RLS por usuário.

create table if not exists public.rotina_diaria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6), -- 0 = domingo, 6 = sábado
  hora_inicio time not null,
  hora_fim time not null,
  atividade text not null,
  area_id uuid references public.areas (id) on delete set null,
  check (hora_fim > hora_inicio)
);

create index if not exists rotina_diaria_user_id_idx on public.rotina_diaria (user_id);
create index if not exists rotina_diaria_area_id_idx on public.rotina_diaria (area_id);
create index if not exists rotina_diaria_dia_semana_idx on public.rotina_diaria (dia_semana);

alter table public.rotina_diaria enable row level security;

create policy "rotina_diaria_select_own" on public.rotina_diaria
  for select using (auth.uid() = user_id);

create policy "rotina_diaria_insert_own" on public.rotina_diaria
  for insert with check (auth.uid() = user_id);

create policy "rotina_diaria_update_own" on public.rotina_diaria
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rotina_diaria_delete_own" on public.rotina_diaria
  for delete using (auth.uid() = user_id);
