-- Life OS — Substitui a Rotina semanal (blocos recorrentes por dia da
-- semana) por Compromissos (eventos pontuais com data específica).
--
-- Escrita pra ser segura de rodar mais de uma vez (idempotente): usa
-- "if exists"/"if not exists" em vez de assumir um nome exato de policy ou
-- um estado exato da tabela, já que só é aplicada manualmente via SQL
-- Editor (sem controle de qual passo já rodou antes).

-- ── 1. Renomeia a tabela (só se ainda não foi renomeada) ─────────────────
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'rotina_diaria') then
    -- Os blocos antigos representavam recorrência ("toda Segunda", etc.),
    -- sem nenhuma data real associada — não há como migrar esses dados pra
    -- um esquema baseado em data, então a tabela é esvaziada como parte da
    -- troca.
    execute 'truncate table public.rotina_diaria';
    execute 'alter table public.rotina_diaria rename to compromissos';
  end if;
end $$;

-- ── 2. Policies com os nomes novos (drop+create em vez de rename, pra não
--    depender de saber o nome exato da policy antiga) ────────────────────
drop policy if exists "rotina_diaria_select_own" on public.compromissos;
drop policy if exists "rotina_diaria_insert_own" on public.compromissos;
drop policy if exists "rotina_diaria_update_own" on public.compromissos;
drop policy if exists "rotina_diaria_delete_own" on public.compromissos;
drop policy if exists "compromissos_select_own" on public.compromissos;
drop policy if exists "compromissos_insert_own" on public.compromissos;
drop policy if exists "compromissos_update_own" on public.compromissos;
drop policy if exists "compromissos_delete_own" on public.compromissos;

create policy "compromissos_select_own" on public.compromissos
  for select using (auth.uid() = user_id);
create policy "compromissos_insert_own" on public.compromissos
  for insert with check (auth.uid() = user_id);
create policy "compromissos_update_own" on public.compromissos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "compromissos_delete_own" on public.compromissos
  for delete using (auth.uid() = user_id);

-- ── 3. Coluna dia_semana → data + feito ───────────────────────────────────
drop index if exists rotina_diaria_dia_semana_idx;
alter table public.compromissos drop column if exists dia_semana;
alter table public.compromissos add column if not exists data date;
alter table public.compromissos add column if not exists feito boolean not null default false;
alter table public.compromissos alter column data set not null;

create index if not exists compromissos_data_idx on public.compromissos (data);

-- ── 4. Novas áreas padrão: Viagem e Curso ─────────────────────────────────
insert into public.areas (user_id, nome, cor, icone, ordem)
select u.id, v.nome, v.cor, v.icone, v.ordem
from auth.users u
cross join (
  values
    ('Viagem', '#22d3ee', '✈️', 107),
    ('Curso', '#facc15', '🎓', 108)
) as v (nome, cor, icone, ordem)
where u.email = 'lari.faesser.lf@gmail.com'
  and not exists (
    select 1 from public.areas a where a.user_id = u.id and a.nome = v.nome
  );
