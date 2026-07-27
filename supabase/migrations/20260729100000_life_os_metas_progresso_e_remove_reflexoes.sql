-- Life OS — Ajustes: progresso de metas vinculado a hábito + remoção de Reflexões

-- 1) metas.habito_id: vínculo opcional a um hábito, usado para calcular progresso
--    automático (ocorrências esperadas x concluídas). Se o hábito for excluído,
--    a meta continua existindo, só perde o vínculo (volta a funcionar sem barra
--    de progresso, como hoje).
alter table public.metas
  add column if not exists habito_id uuid references public.habits (id) on delete set null;

create index if not exists metas_habito_id_idx on public.metas (habito_id);

-- 2) Remoção completa do módulo de Reflexões — tela, rota e dados.
drop table if exists public.reflexoes;
