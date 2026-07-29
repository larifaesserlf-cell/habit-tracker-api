-- Life OS — Substitui a Rotina semanal (blocos recorrentes por dia da
-- semana) por Compromissos (eventos pontuais com data específica).

-- Os blocos antigos representavam recorrência ("toda Segunda", etc.), sem
-- nenhuma data real associada — não há como migrar esses dados pra um
-- esquema baseado em data, então a tabela é esvaziada como parte da troca.
truncate table public.rotina_diaria;

alter table public.rotina_diaria rename to compromissos;

alter policy "rotina_diaria_select_own" on public.compromissos rename to "compromissos_select_own";
alter policy "rotina_diaria_insert_own" on public.compromissos rename to "compromissos_insert_own";
alter policy "rotina_diaria_update_own" on public.compromissos rename to "compromissos_update_own";
alter policy "rotina_diaria_delete_own" on public.compromissos rename to "compromissos_delete_own";

drop index if exists rotina_diaria_dia_semana_idx;
alter table public.compromissos drop column dia_semana;
alter table public.compromissos
  add column data date not null,
  add column feito boolean not null default false;

create index compromissos_data_idx on public.compromissos (data);

-- ── Novas áreas padrão: Viagem e Curso ───────────────────────────────────
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
