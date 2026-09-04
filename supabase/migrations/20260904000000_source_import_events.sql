-- Histórico de importação / aparições (TDD §2.3, SRS RF8).
-- search_execution_id fica sem foreign key por enquanto: a tabela
-- search_executions ainda não existe (módulo de Busca Sistemática,
-- TDD §2.4, fase futura) — confirmado contra o banco ao vivo em 2026-09-04.
-- Quando search_executions for criada, uma migration futura deve adicionar
-- a foreign key (sem reescrever esta).

create table public.source_import_events (
  id                  uuid primary key default gen_random_uuid(),
  source_id           uuid not null references public.sources(id) on delete cascade,
  import_channel      text not null check (import_channel in
                        ('ris','link','pdf','manual','busca_sistematica')),
  search_execution_id uuid,
  origin_reference    text,
  occurred_at         timestamptz not null default now()
);

create index idx_import_events_source on public.source_import_events(source_id);

alter table public.source_import_events enable row level security;

create policy "owner full access source_import_events" on public.source_import_events
  for all using (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()));

grant select, insert, update, delete on public.source_import_events to authenticated;
grant all on public.source_import_events to service_role;
