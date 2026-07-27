-- Life OS — Hábitos: frequência expandida (dias específicos / mensal) +
-- seed de áreas padrão.

-- ── 1. Frequência expandida ──────────────────────────────────────────────
-- 'semanal' não distinguia nenhum dia específico e, na prática, já
-- aparecia todo dia em /hoje (não havia filtro nenhum por frequência).
-- Migra esses hábitos pra 'diario', que preserva exatamente esse
-- comportamento, antes de trocar a constraint por um valor que não existe
-- mais.
update public.habits set frequencia = 'diario' where frequencia = 'semanal';

alter table public.habits drop constraint if exists habits_frequencia_check;

alter table public.habits
  add column if not exists dias_semana int[],
  add column if not exists dia_mes int;

alter table public.habits
  add constraint habits_frequencia_check
    check (frequencia in ('diario', 'dias_especificos', 'mensal')),
  add constraint habits_dia_mes_check
    check (dia_mes is null or (dia_mes >= 1 and dia_mes <= 31));

-- ── 2. Seed de áreas padrão (usuária atual, sem duplicar) ────────────────
insert into public.areas (user_id, nome, cor, icone, ordem)
select u.id, v.nome, v.cor, v.icone, v.ordem
from auth.users u
cross join (
  values
    ('Saúde', '#4ade80', '🩺', 100),
    ('Estudo', '#38bdf8', '📚', 101),
    ('Trabalho', '#fbbf24', '💼', 102),
    ('Casa/Organização', '#2dd4bf', '🏠', 103),
    ('Social', '#f472b6', '🎉', 104),
    ('Mental', '#a78bfa', '🧘', 105),
    ('Lazer', '#fb923c', '🎮', 106)
) as v (nome, cor, icone, ordem)
where u.email = 'lari.faesser.lf@gmail.com'
  and not exists (
    select 1 from public.areas a where a.user_id = u.id and a.nome = v.nome
  );
