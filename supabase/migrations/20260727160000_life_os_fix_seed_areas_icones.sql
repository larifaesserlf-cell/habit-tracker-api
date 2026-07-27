-- Life OS — Corrige o seed de áreas padrão (fase anterior só criou 2 das 7
-- áreas novas, provavelmente truncado ao rodar manualmente no SQL Editor)
-- e corrige os ícones: todas as áreas — novas e antigas — estavam caindo no
-- valor padrão da coluna (🔥) em vez do ícone pretendido de cada uma.

-- ── 1. Insere as áreas padrão que ainda não existem (idempotente) ────────
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

-- ── 2. Corrige o ícone de todas as áreas (novas e as que já existiam) ────
update public.areas
set icone = v.icone
from (
  values
    ('Saúde', '🩺'),
    ('Estudo', '📚'),
    ('Trabalho', '💼'),
    ('Casa/Organização', '🏠'),
    ('Social', '🎉'),
    ('Mental', '🧘'),
    ('Lazer', '🎮'),
    ('Carreira/Dev', '💻'),
    ('Treino', '🏋️'),
    ('Financeiro', '💰'),
    ('Rotina/Hábitos', '🔁'),
    ('Emocional/Reflexivo', '🪞'),
    ('Cultura/Mídia', '🎬'),
    ('Viagens', '✈️')
) as v (nome, icone)
where areas.nome = v.nome
  and areas.user_id = (select id from auth.users where email = 'lari.faesser.lf@gmail.com');
