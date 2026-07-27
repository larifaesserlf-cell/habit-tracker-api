-- Life OS — Corrige "infinite recursion detected in policy for relation
-- lista_membros". A policy de select de lista_membros consultava a própria
-- lista_membros pra checar membership — Postgres reaplica RLS a essa
-- subquery interna, que reaplica de novo, indefinidamente. E como
-- listas_watch/itens_watch também consultam lista_membros nas próprias
-- policies, a recursão vazava pra lá também.
--
-- Fix padrão do Supabase pra esse caso: mover o check de membership pra
-- uma função security definer — dentro dela a consulta a lista_membros
-- roda com privilégio de dono da função (bypassa RLS), quebrando o ciclo.

create or replace function public.eh_membro_da_lista(p_lista_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.lista_membros m
    where m.lista_id = p_lista_id and m.user_id = auth.uid()
  );
$$;

grant execute on function public.eh_membro_da_lista(uuid) to authenticated;

-- ── listas_watch ──────────────────────────────────────────────────────────
drop policy if exists "listas_watch_select_membro" on public.listas_watch;
create policy "listas_watch_select_membro" on public.listas_watch
  for select using (public.eh_membro_da_lista(id));

drop policy if exists "listas_watch_update_membro" on public.listas_watch;
create policy "listas_watch_update_membro" on public.listas_watch
  for update using (public.eh_membro_da_lista(id)) with check (public.eh_membro_da_lista(id));

drop policy if exists "listas_watch_delete_membro" on public.listas_watch;
create policy "listas_watch_delete_membro" on public.listas_watch
  for delete using (public.eh_membro_da_lista(id));

-- ── lista_membros (a que de fato recursava) ──────────────────────────────
drop policy if exists "lista_membros_select_membro" on public.lista_membros;
create policy "lista_membros_select_membro" on public.lista_membros
  for select using (public.eh_membro_da_lista(lista_id));

-- ── itens_watch ───────────────────────────────────────────────────────────
drop policy if exists "itens_watch_select_membro" on public.itens_watch;
create policy "itens_watch_select_membro" on public.itens_watch
  for select using (public.eh_membro_da_lista(lista_id));

drop policy if exists "itens_watch_insert_membro" on public.itens_watch;
create policy "itens_watch_insert_membro" on public.itens_watch
  for insert with check (adicionado_por = auth.uid() and public.eh_membro_da_lista(lista_id));

drop policy if exists "itens_watch_update_membro" on public.itens_watch;
create policy "itens_watch_update_membro" on public.itens_watch
  for update using (public.eh_membro_da_lista(lista_id)) with check (public.eh_membro_da_lista(lista_id));

drop policy if exists "itens_watch_delete_membro" on public.itens_watch;
create policy "itens_watch_delete_membro" on public.itens_watch
  for delete using (public.eh_membro_da_lista(lista_id));
