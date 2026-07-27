-- Life OS — Lista compartilhada de filmes/séries (múltiplos usuários numa
-- mesma lista, diferente do padrão de user_id único usado no resto do
-- projeto). RLS baseada em membership (lista_membros), não em posse direta.

-- ─────────────────────────────────────────────────────────────
-- 1. Tabelas
-- ─────────────────────────────────────────────────────────────
create table if not exists public.listas_watch (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_por uuid references auth.users (id) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lista_membros (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid references public.listas_watch (id) on delete cascade not null,
  user_id uuid references auth.users (id) not null,
  created_at timestamptz not null default now(),
  unique (lista_id, user_id)
);

create table if not exists public.itens_watch (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid references public.listas_watch (id) on delete cascade not null,
  tipo text check (tipo in ('filme', 'serie')) not null,
  titulo text not null,
  ano_lancamento int,
  capa_url text,
  status text check (status in ('quero_assistir', 'em_andamento', 'concluido')) default 'quero_assistir',
  adicionado_por uuid references auth.users (id) not null,
  nota numeric(3, 1) check (nota between 0 and 10),
  comentario text,
  created_at timestamptz not null default now()
);

create table if not exists public.convites_lista (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid references public.listas_watch (id) on delete cascade not null,
  token uuid not null default gen_random_uuid(),
  criado_por uuid references auth.users (id) not null,
  usado boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists lista_membros_lista_id_idx on public.lista_membros (lista_id);
create index if not exists lista_membros_user_id_idx on public.lista_membros (user_id);
create index if not exists itens_watch_lista_id_idx on public.itens_watch (lista_id);
create index if not exists convites_lista_lista_id_idx on public.convites_lista (lista_id);
create unique index if not exists convites_lista_token_idx on public.convites_lista (token);

-- ─────────────────────────────────────────────────────────────
-- 2. RLS
-- ─────────────────────────────────────────────────────────────
alter table public.listas_watch enable row level security;
alter table public.lista_membros enable row level security;
alter table public.itens_watch enable row level security;
alter table public.convites_lista enable row level security;

-- listas_watch: select/update/delete só pra quem é membro; insert livre
-- (o próprio usuário vira criado_por e é adicionado como membro via
-- trigger logo abaixo).
create policy "listas_watch_select_membro" on public.listas_watch
  for select using (
    exists (
      select 1 from public.lista_membros m
      where m.lista_id = listas_watch.id and m.user_id = auth.uid()
    )
  );

create policy "listas_watch_insert_auth" on public.listas_watch
  for insert with check (auth.uid() = criado_por);

create policy "listas_watch_update_membro" on public.listas_watch
  for update using (
    exists (
      select 1 from public.lista_membros m
      where m.lista_id = listas_watch.id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.lista_membros m
      where m.lista_id = listas_watch.id and m.user_id = auth.uid()
    )
  );

create policy "listas_watch_delete_membro" on public.listas_watch
  for delete using (
    exists (
      select 1 from public.lista_membros m
      where m.lista_id = listas_watch.id and m.user_id = auth.uid()
    )
  );

-- lista_membros: só select (pra ver quem mais está na lista). Não há
-- policy de insert/update/delete pro cliente — a única forma de entrar
-- numa lista é resgatando um convite via a função redeem_convite()
-- abaixo, que roda com privilégio elevado (security definer) e ignora RLS.
create policy "lista_membros_select_membro" on public.lista_membros
  for select using (
    exists (
      select 1 from public.lista_membros m2
      where m2.lista_id = lista_membros.lista_id and m2.user_id = auth.uid()
    )
  );

-- itens_watch: qualquer membro da lista pode ver, criar, editar e apagar
-- qualquer item (lista compartilhada de verdade, não só o autor original).
create policy "itens_watch_select_membro" on public.itens_watch
  for select using (
    exists (
      select 1 from public.lista_membros m
      where m.lista_id = itens_watch.lista_id and m.user_id = auth.uid()
    )
  );

create policy "itens_watch_insert_membro" on public.itens_watch
  for insert with check (
    adicionado_por = auth.uid()
    and exists (
      select 1 from public.lista_membros m
      where m.lista_id = itens_watch.lista_id and m.user_id = auth.uid()
    )
  );

create policy "itens_watch_update_membro" on public.itens_watch
  for update using (
    exists (
      select 1 from public.lista_membros m
      where m.lista_id = itens_watch.lista_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.lista_membros m
      where m.lista_id = itens_watch.lista_id and m.user_id = auth.uid()
    )
  );

create policy "itens_watch_delete_membro" on public.itens_watch
  for delete using (
    exists (
      select 1 from public.lista_membros m
      where m.lista_id = itens_watch.lista_id and m.user_id = auth.uid()
    )
  );

-- convites_lista: só o criador vê/cria seus próprios convites. A leitura
-- do token por quem RECEBEU o link (ainda não é membro) e a marcação de
-- "usado" acontecem via redeem_convite() (security definer), não via RLS
-- de usuário anônimo/autenticado comum.
create policy "convites_lista_select_criador" on public.convites_lista
  for select using (auth.uid() = criado_por);

create policy "convites_lista_insert_criador" on public.convites_lista
  for insert with check (auth.uid() = criado_por);

-- ─────────────────────────────────────────────────────────────
-- 3. Funções com privilégio elevado (security definer)
-- ─────────────────────────────────────────────────────────────
-- Em vez de uma service role key na aplicação (que bypassa RLS em TODAS
-- as tabelas do projeto se vazar), usa-se funções Postgres com escopo
-- estrito só pra essas duas operações que legitimamente precisam
-- contornar a RLS padrão.

-- Adiciona automaticamente quem cria uma lista como membro dela — sem
-- isso, o insert em listas_watch teria sucesso (permitido pela policy de
-- insert) mas a pessoa não conseguiria nem ENXERGAR a lista que acabou de
-- criar, já que listas_watch_select_membro exige ser membro.
create or replace function public.adicionar_criador_como_membro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lista_membros (lista_id, user_id)
  values (new.id, new.criado_por)
  on conflict (lista_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_adicionar_criador_como_membro on public.listas_watch;
create trigger trg_adicionar_criador_como_membro
  after insert on public.listas_watch
  for each row execute function public.adicionar_criador_como_membro();

-- Resgata um convite: valida o token, adiciona quem chamou como membro da
-- lista e marca o convite como usado. Levanta uma exceção com um código
-- identificável (CONVITE_INVALIDO / CONVITE_JA_USADO / NAO_AUTENTICADO)
-- pra a aplicação mostrar uma mensagem clara.
create or replace function public.redeem_convite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convite public.convites_lista%rowtype;
begin
  if auth.uid() is null then
    raise exception 'NAO_AUTENTICADO';
  end if;

  select * into v_convite from public.convites_lista where token = p_token for update;

  if v_convite is null then
    raise exception 'CONVITE_INVALIDO';
  end if;

  if v_convite.usado then
    raise exception 'CONVITE_JA_USADO';
  end if;

  insert into public.lista_membros (lista_id, user_id)
  values (v_convite.lista_id, auth.uid())
  on conflict (lista_id, user_id) do nothing;

  update public.convites_lista set usado = true where id = v_convite.id;

  return v_convite.lista_id;
end;
$$;

-- Retorna e-mail/nome dos membros de uma lista — só pra quem já é membro
-- dela (checado dentro da função). Necessário porque auth.users não é
-- acessível diretamente via RLS normal pro cliente, mas o app precisa
-- mostrar "quem adicionou" cada item e quem está na lista.
create or replace function public.membros_da_lista(p_lista_id uuid)
returns table (user_id uuid, email text, nome text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.lista_membros m
    where m.lista_id = p_lista_id and m.user_id = auth.uid()
  ) then
    return;
  end if;

  return query
    select u.id, u.email::text, (u.raw_user_meta_data ->> 'name')
    from public.lista_membros m
    join auth.users u on u.id = m.user_id
    where m.lista_id = p_lista_id;
end;
$$;

grant execute on function public.redeem_convite(uuid) to authenticated;
grant execute on function public.membros_da_lista(uuid) to authenticated;
