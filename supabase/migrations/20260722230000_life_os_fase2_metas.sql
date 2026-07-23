-- Life OS — Fase 2: Metas
-- Cria a tabela metas, vinculada a areas, com RLS por usuário via join.

create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas (id) on delete cascade,
  titulo text not null,
  tipo text not null check (tipo in ('curto', 'medio', 'longo')),
  status text not null default 'ativa' check (status in ('ativa', 'concluida', 'abandonada')),
  data_alvo date,
  created_at timestamptz not null default now()
);

create index if not exists metas_area_id_idx on public.metas (area_id);

alter table public.metas enable row level security;

-- metas não tem user_id direto: a posse é verificada via join com areas.
create policy "metas_select_own" on public.metas
  for select using (
    exists (
      select 1 from public.areas
      where areas.id = metas.area_id
        and areas.user_id = auth.uid()
    )
  );

create policy "metas_insert_own" on public.metas
  for insert with check (
    exists (
      select 1 from public.areas
      where areas.id = metas.area_id
        and areas.user_id = auth.uid()
    )
  );

create policy "metas_update_own" on public.metas
  for update using (
    exists (
      select 1 from public.areas
      where areas.id = metas.area_id
        and areas.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.areas
      where areas.id = metas.area_id
        and areas.user_id = auth.uid()
    )
  );

create policy "metas_delete_own" on public.metas
  for delete using (
    exists (
      select 1 from public.areas
      where areas.id = metas.area_id
        and areas.user_id = auth.uid()
    )
  );
