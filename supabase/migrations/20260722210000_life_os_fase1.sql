-- Life OS — Fase 1: Áreas + Hábitos
-- Cria as tabelas habits, habit_logs e areas, com RLS por usuário.

-- ─────────────────────────────────────────────────────────────
-- 1. habits
-- ─────────────────────────────────────────────────────────────
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  frequencia text not null check (frequencia in ('diario', 'semanal')),
  created_at timestamptz not null default now()
);

create index if not exists habits_user_id_idx on public.habits (user_id);

alter table public.habits enable row level security;

create policy "habits_select_own" on public.habits
  for select using (auth.uid() = user_id);

create policy "habits_insert_own" on public.habits
  for insert with check (auth.uid() = user_id);

create policy "habits_update_own" on public.habits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "habits_delete_own" on public.habits
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 2. habit_logs (check-in diário)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  data date not null,
  status boolean not null default false,
  unique (habit_id, data)
);

create index if not exists habit_logs_habit_id_idx on public.habit_logs (habit_id);
create index if not exists habit_logs_data_idx on public.habit_logs (data);

alter table public.habit_logs enable row level security;

-- habit_logs não tem user_id direto: a posse é verificada via join com habits.
create policy "habit_logs_select_own" on public.habit_logs
  for select using (
    exists (
      select 1 from public.habits
      where habits.id = habit_logs.habit_id
        and habits.user_id = auth.uid()
    )
  );

create policy "habit_logs_insert_own" on public.habit_logs
  for insert with check (
    exists (
      select 1 from public.habits
      where habits.id = habit_logs.habit_id
        and habits.user_id = auth.uid()
    )
  );

create policy "habit_logs_update_own" on public.habit_logs
  for update using (
    exists (
      select 1 from public.habits
      where habits.id = habit_logs.habit_id
        and habits.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.habits
      where habits.id = habit_logs.habit_id
        and habits.user_id = auth.uid()
    )
  );

create policy "habit_logs_delete_own" on public.habit_logs
  for delete using (
    exists (
      select 1 from public.habits
      where habits.id = habit_logs.habit_id
        and habits.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. areas
-- ─────────────────────────────────────────────────────────────
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  cor text not null default '#7c6af7',
  icone text not null default '🔥',
  ordem int not null default 0,
  -- Necessário para a ação de "arquivar" pedida na UI; não removível sem
  -- perder a distinção entre área ativa e arquivada.
  arquivada boolean not null default false
);

create index if not exists areas_user_id_idx on public.areas (user_id);

alter table public.areas enable row level security;

create policy "areas_select_own" on public.areas
  for select using (auth.uid() = user_id);

create policy "areas_insert_own" on public.areas
  for insert with check (auth.uid() = user_id);

create policy "areas_update_own" on public.areas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "areas_delete_own" on public.areas
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. habits.area_id (vínculo opcional a uma área)
-- ─────────────────────────────────────────────────────────────
alter table public.habits
  add column if not exists area_id uuid references public.areas (id) on delete set null;

create index if not exists habits_area_id_idx on public.habits (area_id);
