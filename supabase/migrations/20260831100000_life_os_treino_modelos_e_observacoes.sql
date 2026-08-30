-- Life OS — Treino: modelos de treino fixos (plano semanal) e um bloco de
-- observações livre pra guardar as regras de progressão/deload/rotação.
-- RLS por user_id, seguindo o mesmo padrão do resto do projeto.

create table public.modelos_treino (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dia_semana text not null,
  nome text not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index modelos_treino_user_id_idx on public.modelos_treino (user_id);

alter table public.modelos_treino enable row level security;

create policy "modelos_treino_select_own" on public.modelos_treino
  for select using (auth.uid() = user_id);
create policy "modelos_treino_insert_own" on public.modelos_treino
  for insert with check (auth.uid() = user_id);
create policy "modelos_treino_update_own" on public.modelos_treino
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "modelos_treino_delete_own" on public.modelos_treino
  for delete using (auth.uid() = user_id);


create table public.modelos_treino_exercicios (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references public.modelos_treino (id) on delete cascade,
  grupo text,
  nome text not null,
  faixa_reps text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index modelos_treino_exercicios_modelo_id_idx on public.modelos_treino_exercicios (modelo_id);

alter table public.modelos_treino_exercicios enable row level security;

-- Posse via join com o modelo pai, mesmo padrão de exercicios_treino -> treinos.
create policy "modelos_treino_exercicios_select_own" on public.modelos_treino_exercicios
  for select using (
    exists (select 1 from public.modelos_treino where modelos_treino.id = modelos_treino_exercicios.modelo_id and modelos_treino.user_id = auth.uid())
  );
create policy "modelos_treino_exercicios_insert_own" on public.modelos_treino_exercicios
  for insert with check (
    exists (select 1 from public.modelos_treino where modelos_treino.id = modelos_treino_exercicios.modelo_id and modelos_treino.user_id = auth.uid())
  );
create policy "modelos_treino_exercicios_update_own" on public.modelos_treino_exercicios
  for update using (
    exists (select 1 from public.modelos_treino where modelos_treino.id = modelos_treino_exercicios.modelo_id and modelos_treino.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.modelos_treino where modelos_treino.id = modelos_treino_exercicios.modelo_id and modelos_treino.user_id = auth.uid())
  );
create policy "modelos_treino_exercicios_delete_own" on public.modelos_treino_exercicios
  for delete using (
    exists (select 1 from public.modelos_treino where modelos_treino.id = modelos_treino_exercicios.modelo_id and modelos_treino.user_id = auth.uid())
  );


-- Um bloco de notas livre só (não datado, ao contrário de observacoes_ciclo)
-- pra guardar referência: regras de progressão, deload, rotação de
-- exercícios etc. Uma linha por usuária (upsert por user_id).
create table public.treino_notas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conteudo text not null default '',
  updated_at timestamptz not null default now()
);

create unique index treino_notas_user_id_idx on public.treino_notas (user_id);

alter table public.treino_notas enable row level security;

create policy "treino_notas_select_own" on public.treino_notas
  for select using (auth.uid() = user_id);
create policy "treino_notas_insert_own" on public.treino_notas
  for insert with check (auth.uid() = user_id);
create policy "treino_notas_update_own" on public.treino_notas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── Seed: os 4 treinos fixos do plano 4x/semana ─────────────────────────────
-- Idempotente: só insere um modelo se ainda não existir um com o mesmo nome
-- pra essa usuária (não duplica se a migration rodar de novo).

with modelo as (
  insert into public.modelos_treino (user_id, dia_semana, nome, ordem)
  select u.id, 'segunda', 'Perna (Variação A)', 1
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (select 1 from public.modelos_treino m where m.user_id = u.id and m.nome = 'Perna (Variação A)')
  returning id
)
insert into public.modelos_treino_exercicios (modelo_id, grupo, nome, faixa_reps, ordem)
select modelo.id, v.grupo, v.nome, v.faixa_reps, v.ordem
from modelo
cross join (
  values
    ('Quadríceps', 'Agachamento Livre', '4x8-12', 1),
    ('Quadríceps', 'Cadeira Extensora', '4x10-15', 2),
    ('Posterior', 'Stiff Barra', '4x8-12', 3),
    ('Posterior', 'Mesa Flexora', '4x10-15', 4),
    ('Glúteo', 'Elevação Pélvica', '4x8-12', 5),
    ('Glúteo', 'Búlgaro Smith', '4x8-12 (cada perna)', 6),
    ('Panturrilha', 'Panturrilha em Pé', '4x12-15', 7),
    ('Panturrilha', 'Panturrilha Sentado', '4x12-15', 8)
) as v (grupo, nome, faixa_reps, ordem);


with modelo as (
  insert into public.modelos_treino (user_id, dia_semana, nome, ordem)
  select u.id, 'terca', 'Superior (Variação A)', 2
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (select 1 from public.modelos_treino m where m.user_id = u.id and m.nome = 'Superior (Variação A)')
  returning id
)
insert into public.modelos_treino_exercicios (modelo_id, grupo, nome, faixa_reps, ordem)
select modelo.id, v.grupo, v.nome, v.faixa_reps, v.ordem
from modelo
cross join (
  values
    ('Costas', 'Puxada Alta Aberta', '4x8-12', 1),
    ('Costas', 'Remada Baixa', '4x8-12', 2),
    ('Bíceps', 'Bíceps Halteres', '4x8-12', 3),
    ('Tríceps', 'Tríceps Corda Polia', '4x8-12', 4),
    ('Tríceps', 'Tríceps Francês Corda', '4x8-12', 5),
    ('Ombro', 'Desenvolvimento Halteres', '4x8-12', 6),
    ('Ombro', 'Elevação Lateral Halteres', '4x10-15', 7)
) as v (grupo, nome, faixa_reps, ordem);


with modelo as (
  insert into public.modelos_treino (user_id, dia_semana, nome, ordem)
  select u.id, 'quinta', 'Perna (Variação B)', 3
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (select 1 from public.modelos_treino m where m.user_id = u.id and m.nome = 'Perna (Variação B)')
  returning id
)
insert into public.modelos_treino_exercicios (modelo_id, grupo, nome, faixa_reps, ordem)
select modelo.id, v.grupo, v.nome, v.faixa_reps, v.ordem
from modelo
cross join (
  values
    ('Quadríceps', 'Leg Press', '4x8-12', 1),
    ('Quadríceps', 'Cadeira Extensora Unilateral', '4x10-15', 2),
    ('Posterior', 'Stiff Smith', '4x8-12', 3),
    ('Posterior', 'Cadeira Flexora', '4x10-15', 4),
    ('Glúteo', 'Coice Polia', '4x10-15', 5),
    ('Glúteo', 'Cadeira Abdutora', '4x12-15', 6),
    ('Panturrilha', 'Panturrilha no Leg Press', '4x12-15', 7),
    ('Panturrilha', 'Panturrilha Sentado (unilateral)', '4x12-15', 8)
) as v (grupo, nome, faixa_reps, ordem);


with modelo as (
  insert into public.modelos_treino (user_id, dia_semana, nome, ordem)
  select u.id, 'sexta', 'Superior (Variação B)', 4
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (select 1 from public.modelos_treino m where m.user_id = u.id and m.nome = 'Superior (Variação B)')
  returning id
)
insert into public.modelos_treino_exercicios (modelo_id, grupo, nome, faixa_reps, ordem)
select modelo.id, v.grupo, v.nome, v.faixa_reps, v.ordem
from modelo
cross join (
  values
    ('Costas', 'Puxada Supinada', '4x8-12', 1),
    ('Costas', 'Remada Cavalinho', '4x8-12', 2),
    ('Bíceps', 'Rosca Direta Barra', '4x8-12', 3),
    ('Tríceps', 'Tríceps Máquina', '4x8-12', 4),
    ('Tríceps', 'Supino Fechado', '4x8-12', 5),
    ('Ombro', 'Desenvolvimento Máquina', '4x8-12', 6),
    ('Ombro', 'Elevação Frontal Polia', '4x10-15', 7)
) as v (grupo, nome, faixa_reps, ordem);


-- ── Seed: observações com as regras de progressão/deload/rotação ───────────
-- Só insere se ainda não existir nenhuma nota pra essa usuária (não sobrescreve
-- se ela já tiver editado algo por engano de rodar a migration de novo).
insert into public.treino_notas (user_id, conteudo)
select u.id, $$Progressão: Dupla progressão — faixa de reps fixa, só sobe carga quando bater o topo da faixa em todas as 4 séries.

Regras de progressão:
1. Escolha um peso onde você consegue fazer pelo menos o piso da faixa (ex: 8 reps) em todas as 4 séries.
2. Toda sessão, tente adicionar 1 repetição em pelo menos uma série, até bater o teto da faixa (ex: 12) em todas as 4 séries.
3. Quando isso acontecer, suba a carga (2.5-5% em exercícios de máquina/barra, o menor incremento disponível em halteres) e volte para o piso da faixa.
4. Isso evita saltos de carga sem lógica.

Deload (a cada 5-6 semanas):
- Mantenha as mesmas cargas da última sessão antes do deload.
- Reduza para 2-3 séries por exercício (em vez de 4).
- Não precisa ir até a falha nessa semana.
- Na semana seguinte, retome a progressão normal.

Rotação futura:
A cada 5-6 semanas, troque os exercícios de uma das duas variações (A ou B) por outros do mesmo grupo muscular — por exemplo, na Variação A trocar Agachamento Livre por Agachamento Smith, ou Puxada Alta Aberta por Puxada Neutra.

Ponto de atenção:
Nenhuma das duas variações de superior tem um exercício de peito direto (supino reto/inclinado) — o mais próximo é o Supino Fechado na Variação B, que trabalha mais tríceps.$$
from auth.users u
where u.email = 'faesserlarissa@gmail.com'
  and not exists (select 1 from public.treino_notas n where n.user_id = u.id);
