-- Life OS — Importa o histórico de treinos anotado pela usuária.
-- Gerado por scripts/parse-treinos-historico.mjs a partir do texto bruto
-- embutido nesse script (rodar de novo só se o texto mudar; a saída é
-- determinística). Idempotente: cada bloco só insere a sessão se ainda não
-- existir uma com a mesma (data, nome) pra essa usuária, e os exercícios só
-- são inseridos junto (via CROSS JOIN com o CTE da sessão) — rodar essa
-- migration duas vezes não duplica nada.
--
-- Atenção: o e-mail real da usuária no Supabase Auth é
-- faesserlarissa@gmail.com (não lari.faesser.lf@gmail.com — já causou
-- migrations "bem-sucedidas" que não inseriam nada antes, ver histórico).

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-06-08', 'Treino 01'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-06-08' and t.nome = 'Treino 01'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Cadeira Extensora', '4x12', '50kg', 1),
    ('Leg Press', '4x12', '55+55', 2),
    ('Cadeira Flexora', '4x12', '25kg', 3),
    ('Mesa Flexora', '4x12', '15kg', 4),
    ('Coice Polia', '4x12', '25kg', 5),
    ('Agachamento Smith', '4x12', '10+10', 6),
    ('Panturrilha Sentado', '4x12', '15kg', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-06-09', 'Treino 03'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-06-09' and t.nome = 'Treino 03'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Puxada Alta Aberta', '4x12', '25kg', 1),
    ('Voador Inverso', '4x12', '20kg', 2),
    ('Elevação Lateral Halteres', '4x12', '5+5', 3),
    ('Desenvolvimento Halteres', '4x12', '7+7', 4),
    ('Tríceps Corda Polia', '4x12', '25kg', 5),
    ('Tríceps Francês Corda', '4x12', '10kg', 6),
    ('Bíceps Halteres', '4x12', '6+6', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-06-15', 'Treino 04'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-06-15' and t.nome = 'Treino 04'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Cadeira Extensora', '4x10', '60kg', 1),
    ('Leg Press', '4x10', '60+60', 2),
    ('Cadeira Flexora', '4x10', '30kg', 3),
    ('Mesa Flexora', '4x12', '20kg', 4),
    ('Coice Polia', '4x12', '25kg', 5),
    ('Agachamento Smith', '4x10', '15+15', 6),
    ('Panturrilha Sentado', '4x12', '15kg', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-06-16', 'Treino 05'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-06-16' and t.nome = 'Treino 05'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Puxada Alta Aberta', '4x10', '30kg', 1),
    ('Voador Inverso', '4x10', '30kg', 2),
    ('Elevação Lateral Halteres', '4x10', '6+6', 3),
    ('Desenvolvimento Halteres', '4x10', '8+8', 4),
    ('Tríceps Corda Polia', '4x12', '25kg', 5),
    ('Tríceps Francês Corda', '4x12', '10kg', 6),
    ('Bíceps Halteres', '4x10', '7+7', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-06-18', 'Treino 06'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-06-18' and t.nome = 'Treino 06'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Elevação Pélvica', '4x12', '20+20', 1),
    ('Búlgaro', '4x12', '10', 2),
    ('Stiff Barra', '3x12', '7.5 + 7.5', 3),
    ('Cadeira Flexora', '4x12', '30', 4),
    ('Cadeira Extensora Unilateral', '4x12', '20', 5),
    ('Panturrilha em Pé', '4x12', 'Livre', 6)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-06-19', 'Treino 07'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-06-19' and t.nome = 'Treino 07'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Remada Baixa', '4x12', '30kg', 1),
    ('Remada Barra', '4x12', '22.5kg', 2),
    ('Biceps Máquina', '4x12', '15kg', 3),
    ('Tríceps Maquina', '4x12', '35kg', 4),
    ('Supino Fechado', '4x12', 'Barra', 5),
    ('Elevação Frontal Polia', '4x10', '10kg', 6),
    ('Desenvolvimento Máquina', '4x12', '20kg', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-06-23', 'Treino 08'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-06-23' and t.nome = 'Treino 08'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Puxada Alta Aberta', '4x15', '25kg', 1),
    ('Voador Inverso', '4x15', '20kg', 2),
    ('Elevação Lateral Halteres', '4x15', '5+5', 3),
    ('Desenvolvimento Halteres', '4x15', '7+7', 4),
    ('Tríceps Corda Polia', '4x15', '20kg', 5),
    ('Tríceps Francês Corda', '4x15', '10kg', 6),
    ('Bíceps Halteres', '4x15', '5+5', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-06-24', 'Treino 09'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-06-24' and t.nome = 'Treino 09'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Cadeira Extensora', '4x15', '30kg', 1),
    ('Leg Press', '4x15', '30+30', 2),
    ('Cadeira Flexora', '4x15', '20kg', 3),
    ('Mesa Flexora', '4x15', '10kg', 4),
    ('Coice Polia', '4x15', '25kg', 5),
    ('Agachamento Smith', '4x12', '10+10', 6),
    ('Panturrilha Sentado', '4x15', '10kg', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-06-19', 'Treino 10'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-06-19' and t.nome = 'Treino 10'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Remada Baixa', '4x15', '25kg', 1),
    ('Remada Barra', '4x12', '22.5kg', 2),
    ('Biceps Máquina', '4x15', '10kg', 3),
    ('Tríceps Maquina', '4x15', '30kg', 4),
    ('Supino Fechado', '4x12', 'Barra', 5),
    ('Elevação Frontal Polia', '4x12', '10kg', 6),
    ('Desenvolvimento Máquina', '4x15', '20kg', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-06-26', 'Treino 11'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-06-26' and t.nome = 'Treino 11'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Elevação Pélvica', '4x15', '20+20', 1),
    ('Búlgaro', '4x15', '5', 2),
    ('Stiff Barra', '4x', 'Barra', 3),
    ('Cadeira Flexora', '4x15', '20', 4),
    ('Cadeira Extensora Unilateral', '4x15', '10', 5),
    ('Panturrilha em Pé', '4x15', '10kg', 6)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-06-30', 'Treino 12'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-06-30' and t.nome = 'Treino 12'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Cadeira Extensora', '4x12', '60kg', 1),
    ('Leg Press', '4x12', '60+60', 2),
    ('Cadeira Flexora', '4x12', '30kg', 3),
    ('Mesa Flexora', '4x12', '20kg', 4),
    ('Coice Polia', '4x12', '25kg', 5),
    ('Agachamento Livre', '4x12', '15+15', 6),
    ('Panturrilha Sentado', '4x12', '20kg', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-07-01', 'Treino 13'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-07-01' and t.nome = 'Treino 13'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Puxada Alta Aberta', '4x12', '30kg', 1),
    ('Voador Inverso', '4x12', '20kg', 2),
    ('Elevação Lateral Halteres', '4x12', '6+6', 3),
    ('Desenvolvimento Halteres', '4x12', '8+8', 4),
    ('Tríceps Corda Polia', '4x12', '25kg', 5),
    ('Tríceps Francês Corda', '4x12', '15kg', 6),
    ('Bíceps Halteres', '4x12', '7+7', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-07-02', 'Treino 14'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-07-02' and t.nome = 'Treino 14'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Elevação Pélvica', '4x12', '25+25', 1),
    ('Búlgaro Smith', '4x12', '10', 2),
    ('Stiff Smith', '4x12', '10+ 10', 3),
    ('Cadeira Flexora', '4x12', '40', 4),
    ('Cadeira Extensora Unilateral', '4x12', '20', 5),
    ('Panturrilha em Pé', '4x12', '10+10', 6)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-07-03', 'Treino 15'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-07-03' and t.nome = 'Treino 15'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Remada Baixa', '4x12', '30kg', 1),
    ('Remada Barra', '4x12', '22.5kg', 2),
    ('Biceps Máquina', '4x12', '15kg', 3),
    ('Tríceps Maquina', '4x12', '35kg', 4),
    ('Supino Fechado', '4x12', 'Barra', 5),
    ('Elevação Frontal Polia', '4x10', '10kg', 6),
    ('Desenvolvimento Máquina', '4x12', '20kg', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-07-06', 'Treino 16'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-07-06' and t.nome = 'Treino 16'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Cadeira Extensora', '4x10', '70kg', 1),
    ('Leg Press', '4x10', '70+70', 2),
    ('Cadeira Flexora', '4x10', '40kg', 3),
    ('Mesa Flexora', '4x12', '30kg', 4),
    ('Coice Polia', '4x12', '30kg', 5),
    ('Agachamento Livre', '4x10', '20+20', 6),
    ('Panturrilha Sentado', '4x10', '20kg', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-07-07', 'Treino 17'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-07-07' and t.nome = 'Treino 17'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Puxada Alta Aberta', '4x8', '8kg', 1),
    ('Voador Inverso', '4x8', '40kg', 2),
    ('Elevação Lateral Halteres', '4x10', '7+7', 3),
    ('Desenvolvimento Halteres', '4x10', '9+9', 4),
    ('Tríceps Corda Polia', '4x10', '30kg', 5),
    ('Tríceps Francês Corda', '4x10', '15kg', 6),
    ('Bíceps Halteres', '4x8', '8+8', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-07-09', 'Treino 15'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-07-09' and t.nome = 'Treino 15'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Remada Baixa', '4x10', '40kg', 1),
    ('Remada Barra', '4x10', '27.5kg', 2),
    ('Biceps Máquina', '4x10', '15kg', 3),
    ('Tríceps Maquina', '4x10', '45kg', 4),
    ('Supino Fechado', '4x10', '2.5 +2.5', 5),
    ('Elevação Frontal Polia', '4x10', '10kg', 6),
    ('Desenvolvimento Barra', '4x10', '2.5 + 2.5', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-07-10', 'Treino 16'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-07-10' and t.nome = 'Treino 16'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Elevação Pélvica', '4x10', '20+20', 1),
    ('Búlgaro Smith', '4x10', '12.5 +12.5', 2),
    ('Stiff Barra', '4x10', '10+ 10', 3),
    ('Cadeira Flexora', '4x10', '50', 4),
    ('Cadeira Extensora Unilateral', '4x10', '30', 5),
    ('Panturrilha em Pé', '4x10', '50', 6)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-07-14', 'Treino 17'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-07-14' and t.nome = 'Treino 17'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Puxada Alta Aberta', '4x8', '8kg', 1),
    ('Voador Inverso', '4x8', '40kg', 2),
    ('Elevação Lateral Halteres', '4x10', '7+7', 3),
    ('Desenvolvimento Halteres', '4x10', '9+9', 4),
    ('Tríceps Corda Polia', '4x10', '30kg', 5),
    ('Tríceps Francês Corda', '4x10', '15kg', 6),
    ('Bíceps Halteres', '4x8', '8+8', 7)
) as v (nome, series_reps, carga, ordem);

with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '2026-07-16', 'Treino 16'
  from auth.users u
  where u.email = 'faesserlarissa@gmail.com'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '2026-07-16' and t.nome = 'Treino 16'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
    ('Cadeira Extensora', '4x10', '80kg', 1),
    ('Leg Press', '4x10', '70+70', 2),
    ('Cadeira Flexora', '4x10', '50kg', 3),
    ('Mesa Flexora', '4x12', '30kg', 4),
    ('Coice Polia', '4x12', '30kg', 5),
    ('Agachamento Livre', '4x10', '20+20', 6),
    ('Panturrilha Sentado', '4x10', '25kg', 7)
) as v (nome, series_reps, carga, ordem);
