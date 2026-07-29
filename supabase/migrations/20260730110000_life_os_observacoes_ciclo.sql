-- Life OS — Substitui o "Registro diário" do Ciclo Menstrual (um registro
-- por data, com fluxo/TPM/humor/sintomas/notas) por "Observações do mês":
-- múltiplas anotações livres por dia, sem fluxo/TPM (que ficam só no
-- controle de início/fim de menstruação, sem alteração ali), com data e
-- hora registradas automaticamente pelo banco.
--
-- Escrita pra ser segura de rodar mais de uma vez (idempotente), seguindo
-- o mesmo padrão já usado na migration de Compromissos.

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'registros_ciclo') then
    execute 'alter table public.registros_ciclo rename to observacoes_ciclo';
  end if;
end $$;

drop policy if exists "registros_ciclo_select_own" on public.observacoes_ciclo;
drop policy if exists "registros_ciclo_insert_own" on public.observacoes_ciclo;
drop policy if exists "registros_ciclo_update_own" on public.observacoes_ciclo;
drop policy if exists "registros_ciclo_delete_own" on public.observacoes_ciclo;
drop policy if exists "observacoes_ciclo_select_own" on public.observacoes_ciclo;
drop policy if exists "observacoes_ciclo_insert_own" on public.observacoes_ciclo;
drop policy if exists "observacoes_ciclo_update_own" on public.observacoes_ciclo;
drop policy if exists "observacoes_ciclo_delete_own" on public.observacoes_ciclo;

create policy "observacoes_ciclo_select_own" on public.observacoes_ciclo
  for select using (auth.uid() = user_id);
create policy "observacoes_ciclo_insert_own" on public.observacoes_ciclo
  for insert with check (auth.uid() = user_id);
create policy "observacoes_ciclo_update_own" on public.observacoes_ciclo
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "observacoes_ciclo_delete_own" on public.observacoes_ciclo
  for delete using (auth.uid() = user_id);

drop index if exists registros_ciclo_data_idx;
alter table public.observacoes_ciclo drop constraint if exists registros_ciclo_user_id_data_key;
alter table public.observacoes_ciclo drop column if exists data;
alter table public.observacoes_ciclo drop column if exists fluxo;
alter table public.observacoes_ciclo drop column if exists tpm;

create index if not exists observacoes_ciclo_created_at_idx on public.observacoes_ciclo (created_at);
