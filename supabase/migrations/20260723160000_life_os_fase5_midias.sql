-- Life OS — Fase 5: Diário de mídias (livros, filmes, séries, documentários)
-- Cria a tabela midias, com RLS por usuário.

create table if not exists public.midias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('livro', 'filme', 'serie', 'documentario')),
  titulo text not null,
  autor_diretor text,
  genero text,
  ano_lancamento int,
  status text not null default 'quero_ver_ler'
    check (status in ('quero_ver_ler', 'em_andamento', 'concluido', 'abandonado')),
  data_inicio date,
  data_conclusao date,
  nota numeric(3, 1) check (nota between 0 and 10),
  temporada_atual int, -- só relevante pra série
  progresso text,      -- ex: "cap. 12" ou "S02E05", livre
  plataforma text,     -- Netflix, papel, Kindle, cinema, etc.
  recomendaria boolean,
  releitura_rewatch boolean not null default false,
  comentario text,
  tags text[],
  created_at timestamptz not null default now()
);

create index if not exists midias_user_id_idx on public.midias (user_id);
create index if not exists midias_tipo_idx on public.midias (tipo);
create index if not exists midias_status_idx on public.midias (status);

alter table public.midias enable row level security;

create policy "midias_select_own" on public.midias
  for select using (auth.uid() = user_id);

create policy "midias_insert_own" on public.midias
  for insert with check (auth.uid() = user_id);

create policy "midias_update_own" on public.midias
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "midias_delete_own" on public.midias
  for delete using (auth.uid() = user_id);
