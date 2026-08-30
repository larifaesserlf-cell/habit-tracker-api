-- Life OS — Corrige um e-mail errado usado em 3 migrations antigas
-- (20260727100000, 20260727160000, 20260729130000): todas filtravam por
-- 'lari.faesser.lf@gmail.com', que nunca existiu em auth.users — o e-mail
-- real da usuária é 'faesserlarissa@gmail.com'. Resultado: nenhuma área
-- padrão foi criada de verdade, nem os ícones corrigidos, apesar de as
-- migrations terem "rodado com sucesso" na época.
--
-- Reaplica os dois efeitos pretendidos, com o e-mail certo:
-- 1) cria as áreas que ainda não existem (idempotente por nome — não
--    duplica "Saúde"/"Estudo", que a usuária já criou manualmente);
-- 2) preenche o ícone só de áreas que ainda estão com o valor em branco
--    (não mexe em nenhuma cor, nem em ícone que já tenha sido escolhido).

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
    ('Lazer', '#fb923c', '🎮', 106),
    ('Viagem', '#22d3ee', '✈️', 107),
    ('Curso', '#facc15', '🎓', 108)
) as v (nome, cor, icone, ordem)
where u.email = 'faesserlarissa@gmail.com'
  and not exists (
    select 1 from public.areas a where a.user_id = u.id and a.nome = v.nome
  );

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
    ('Viagem', '✈️'),
    ('Curso', '🎓')
) as v (nome, icone)
where areas.nome = v.nome
  and (areas.icone is null or areas.icone = '')
  and areas.user_id = (select id from auth.users where email = 'faesserlarissa@gmail.com');
