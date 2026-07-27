-- Life OS — adiciona capa/poster ao diário de mídias
-- Preenchida automaticamente via autocomplete (TMDB pra filme/série,
-- Google Books pra livro) ou fica nula se a pessoa cadastrar manualmente.

alter table public.midias
  add column if not exists capa_url text;
