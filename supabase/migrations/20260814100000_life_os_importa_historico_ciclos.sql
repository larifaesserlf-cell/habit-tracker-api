-- Life OS — Importa o histórico completo de ciclos menstruais (anotado à
-- parte, fora do app) e adiciona uma unique constraint (user_id, data_inicio)
-- pra deixar a importação idempotente: rodar esta migration mais de uma vez
-- não duplica nada, o "on conflict do nothing" simplesmente ignora as datas
-- de início que já existirem.

create unique index if not exists ciclos_menstruais_user_data_inicio_idx
  on public.ciclos_menstruais (user_id, data_inicio);

insert into public.ciclos_menstruais (user_id, data_inicio, data_fim)
select u.id, v.data_inicio, v.data_fim
from auth.users u
cross join (
  values
    ('2023-10-07'::date, '2023-10-10'::date),
    ('2023-11-03', '2023-11-09'),
    ('2023-12-14', '2023-12-19'),
    ('2024-01-13', '2024-01-19'),
    ('2024-02-13', '2024-02-19'),
    ('2024-03-17', '2024-03-22'),
    ('2024-04-15', '2024-04-25'),
    ('2024-05-19', '2024-05-26'),
    ('2024-06-27', '2024-07-04'),
    ('2024-07-28', '2024-08-05'),
    ('2024-08-30', '2024-09-06'),
    ('2024-09-30', '2024-10-08'),
    ('2024-11-03', '2024-11-09'),
    ('2024-11-30', '2024-12-07'),
    ('2024-12-30', '2025-01-04'),
    ('2025-01-22', '2025-01-29'),
    ('2025-03-04', '2025-03-09'),
    ('2025-04-05', '2025-04-10'),
    ('2025-05-09', '2025-05-16'),
    ('2025-07-04', '2025-07-10'),
    ('2025-08-04', '2025-08-08'),
    ('2025-09-03', '2025-09-09'),
    ('2025-10-04', '2025-10-07'),
    ('2025-10-31', '2025-11-04'),
    ('2025-11-25', '2025-11-30'),
    ('2025-12-23', '2025-12-29'),
    ('2026-01-18', '2026-01-22'),
    ('2026-02-12', '2026-02-16'),
    ('2026-03-12', '2026-03-16'),
    ('2026-04-08', '2026-04-12'),
    ('2026-05-05', '2026-05-08'),
    ('2026-06-02', '2026-06-06'),
    ('2026-07-03', '2026-07-07'),
    ('2026-07-27', '2026-08-04'),
    ('2026-08-27', '2026-08-30')
) as v (data_inicio, data_fim)
where u.email = 'faesserlarissa@gmail.com'
on conflict (user_id, data_inicio) do nothing;
