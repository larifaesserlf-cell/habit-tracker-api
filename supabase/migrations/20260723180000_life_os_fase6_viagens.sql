-- Life OS — Fase 6: Viagens e lugares
-- Hierarquia: viagens -> destinos -> pontos_interesse / hospedagens
-- transportes vincula-se à viagem, com origem/destino opcionais entre destinos.

create table if not exists public.viagens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  status text not null default 'quero_fazer'
    check (status in ('quero_fazer', 'planejando', 'confirmada', 'concluida')),
  data_prevista_inicio date,
  data_prevista_fim date,
  orcamento_estimado numeric,
  orcamento_real numeric,
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists public.destinos (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.viagens (id) on delete cascade,
  nome_cidade text not null,
  pais text,
  dias_estimados int,
  ordem int not null default 0,
  notas text
);

create table if not exists public.pontos_interesse (
  id uuid primary key default gen_random_uuid(),
  destino_id uuid not null references public.destinos (id) on delete cascade,
  nome text not null,
  tipo text,
  prioridade text not null default 'se_der_tempo'
    check (prioridade in ('imperdivel', 'se_der_tempo', 'opcional')),
  status text not null default 'quero_ir' check (status in ('quero_ir', 'visitado')),
  data_visita date,
  nota numeric check (nota between 0 and 10),
  custo_estimado numeric,
  duracao_estimada_horas numeric,
  link text,
  comentario text
);

create table if not exists public.hospedagens (
  id uuid primary key default gen_random_uuid(),
  destino_id uuid not null references public.destinos (id) on delete cascade,
  nome text,
  tipo text,
  regiao_bairro text,
  faixa_preco text,
  link text,
  reservado boolean not null default false,
  notas text
);

create table if not exists public.transportes (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.viagens (id) on delete cascade,
  destino_origem_id uuid references public.destinos (id) on delete set null,
  destino_destino_id uuid references public.destinos (id) on delete set null,
  tipo text,
  custo_estimado numeric,
  duracao_estimada_horas numeric,
  notas text
);

create index if not exists viagens_user_id_idx on public.viagens (user_id);
create index if not exists destinos_viagem_id_idx on public.destinos (viagem_id);
create index if not exists pontos_interesse_destino_id_idx on public.pontos_interesse (destino_id);
create index if not exists hospedagens_destino_id_idx on public.hospedagens (destino_id);
create index if not exists transportes_viagem_id_idx on public.transportes (viagem_id);
create index if not exists transportes_destino_origem_id_idx on public.transportes (destino_origem_id);
create index if not exists transportes_destino_destino_id_idx on public.transportes (destino_destino_id);

alter table public.viagens enable row level security;
alter table public.destinos enable row level security;
alter table public.pontos_interesse enable row level security;
alter table public.hospedagens enable row level security;
alter table public.transportes enable row level security;

-- ── viagens: user_id direto ─────────────────────────────────────────
create policy "viagens_select_own" on public.viagens
  for select using (auth.uid() = user_id);
create policy "viagens_insert_own" on public.viagens
  for insert with check (auth.uid() = user_id);
create policy "viagens_update_own" on public.viagens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "viagens_delete_own" on public.viagens
  for delete using (auth.uid() = user_id);

-- ── destinos: posse via join com viagens ────────────────────────────
create policy "destinos_select_own" on public.destinos
  for select using (
    exists (select 1 from public.viagens where viagens.id = destinos.viagem_id and viagens.user_id = auth.uid())
  );
create policy "destinos_insert_own" on public.destinos
  for insert with check (
    exists (select 1 from public.viagens where viagens.id = destinos.viagem_id and viagens.user_id = auth.uid())
  );
create policy "destinos_update_own" on public.destinos
  for update using (
    exists (select 1 from public.viagens where viagens.id = destinos.viagem_id and viagens.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.viagens where viagens.id = destinos.viagem_id and viagens.user_id = auth.uid())
  );
create policy "destinos_delete_own" on public.destinos
  for delete using (
    exists (select 1 from public.viagens where viagens.id = destinos.viagem_id and viagens.user_id = auth.uid())
  );

-- ── pontos_interesse: posse via join destinos -> viagens ────────────
create policy "pontos_interesse_select_own" on public.pontos_interesse
  for select using (
    exists (
      select 1 from public.destinos join public.viagens on viagens.id = destinos.viagem_id
      where destinos.id = pontos_interesse.destino_id and viagens.user_id = auth.uid()
    )
  );
create policy "pontos_interesse_insert_own" on public.pontos_interesse
  for insert with check (
    exists (
      select 1 from public.destinos join public.viagens on viagens.id = destinos.viagem_id
      where destinos.id = pontos_interesse.destino_id and viagens.user_id = auth.uid()
    )
  );
create policy "pontos_interesse_update_own" on public.pontos_interesse
  for update using (
    exists (
      select 1 from public.destinos join public.viagens on viagens.id = destinos.viagem_id
      where destinos.id = pontos_interesse.destino_id and viagens.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.destinos join public.viagens on viagens.id = destinos.viagem_id
      where destinos.id = pontos_interesse.destino_id and viagens.user_id = auth.uid()
    )
  );
create policy "pontos_interesse_delete_own" on public.pontos_interesse
  for delete using (
    exists (
      select 1 from public.destinos join public.viagens on viagens.id = destinos.viagem_id
      where destinos.id = pontos_interesse.destino_id and viagens.user_id = auth.uid()
    )
  );

-- ── hospedagens: posse via join destinos -> viagens ─────────────────
create policy "hospedagens_select_own" on public.hospedagens
  for select using (
    exists (
      select 1 from public.destinos join public.viagens on viagens.id = destinos.viagem_id
      where destinos.id = hospedagens.destino_id and viagens.user_id = auth.uid()
    )
  );
create policy "hospedagens_insert_own" on public.hospedagens
  for insert with check (
    exists (
      select 1 from public.destinos join public.viagens on viagens.id = destinos.viagem_id
      where destinos.id = hospedagens.destino_id and viagens.user_id = auth.uid()
    )
  );
create policy "hospedagens_update_own" on public.hospedagens
  for update using (
    exists (
      select 1 from public.destinos join public.viagens on viagens.id = destinos.viagem_id
      where destinos.id = hospedagens.destino_id and viagens.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.destinos join public.viagens on viagens.id = destinos.viagem_id
      where destinos.id = hospedagens.destino_id and viagens.user_id = auth.uid()
    )
  );
create policy "hospedagens_delete_own" on public.hospedagens
  for delete using (
    exists (
      select 1 from public.destinos join public.viagens on viagens.id = destinos.viagem_id
      where destinos.id = hospedagens.destino_id and viagens.user_id = auth.uid()
    )
  );

-- ── transportes: posse via join direto com viagens ──────────────────
create policy "transportes_select_own" on public.transportes
  for select using (
    exists (select 1 from public.viagens where viagens.id = transportes.viagem_id and viagens.user_id = auth.uid())
  );
create policy "transportes_insert_own" on public.transportes
  for insert with check (
    exists (select 1 from public.viagens where viagens.id = transportes.viagem_id and viagens.user_id = auth.uid())
  );
create policy "transportes_update_own" on public.transportes
  for update using (
    exists (select 1 from public.viagens where viagens.id = transportes.viagem_id and viagens.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.viagens where viagens.id = transportes.viagem_id and viagens.user_id = auth.uid())
  );
create policy "transportes_delete_own" on public.transportes
  for delete using (
    exists (select 1 from public.viagens where viagens.id = transportes.viagem_id and viagens.user_id = auth.uid())
  );
