-- Life OS — Remove o ícone padrão de área (🔥). O ícone passa a ser
-- totalmente opcional/manual: sem valor forçado quando não escolhido.

alter table public.areas alter column icone set default '';

update public.areas set icone = '' where icone = '🔥';
