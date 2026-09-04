-- Extensão não-destrutiva do schema de `sources` para zero perda de campos
-- na importação de RIS (título traduzido, resumo multilíngue, ISSN/ISBN,
-- link de PDF direto, base de origem).
--
-- Esta migration SUBSTITUI a abordagem de 20260813120000_rebuild_sources_schema.sql
-- (que fazia `drop table if exists public.sources cascade` e recriava tudo do
-- zero) porque, quando aquela migration foi escrita, o banco estava vazio —
-- hoje (2026-09-04) há 181 fontes reais cadastradas (10/08 a 01/09), e o DROP
-- apagaria todas elas em cascata (source_people/source_keywords/source_tags/
-- project_sources incluídos). A migration de 13/08 é mantida no histórico
-- (instrução explícita: não reescrever), mas NÃO deve ser aplicada — os
-- mesmos objetos que ela criaria já existem ou são criados aqui via ALTER/
-- CREATE, preservando os dados existentes. Backup completo (dump JSON +
-- exportação RIS) das 181 fontes tirado antes desta migration em
-- backups/pre-migration-2026-09-04.{json,ris}.

-- Colunas novas em `sources` (tags RIS SN/DB/ID + registro bruto completo) --

alter table public.sources
  add column if not exists issn_isbn text,
  add column if not exists database_source text,
  add column if not exists external_id text,
  add column if not exists raw_import_data jsonb;

create index if not exists idx_sources_database_source on public.sources(database_source);

-- `source_people.role` precisa aceitar 'editor' (tags RIS A2/A3, editor de
-- livro/coletânea) — extensão do check existente, sem tocar nos dados.
alter table public.source_people drop constraint if exists source_people_role_check;
alter table public.source_people add constraint source_people_role_check
  check (role in ('autor','orientador','coorientador','organizador',
         'tradutor','ilustrador','editor'));

-- Tabelas novas -------------------------------------------------------------

-- Títulos alternativos/traduzidos (tag RIS "TT", pode repetir). A entrada
-- "principal" (tag "TI", que também é gravada em sources.title) também vira
-- uma linha aqui, com title_type = 'principal'.
create table if not exists public.source_titles (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references public.sources(id) on delete cascade,
  title_text  text not null,
  language    text,
  title_type  text not null default 'traduzido' check (title_type in ('principal','traduzido')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_source_titles_source on public.source_titles(source_id);

-- Resumos em múltiplos idiomas (tag RIS "AB", pode repetir).
create table if not exists public.source_abstracts (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid not null references public.sources(id) on delete cascade,
  abstract_text text not null,
  language      text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_source_abstracts_source on public.source_abstracts(source_id);

-- Links múltiplos (tag RIS "UR" + "L1"-"L4": página, PDF direto, etc.)
create table if not exists public.source_links (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references public.sources(id) on delete cascade,
  url         text not null,
  link_type   text not null default 'outro' check (link_type in ('pagina','pdf_direto','outro')),
  label       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_source_links_source on public.source_links(source_id);
create index if not exists idx_source_links_type on public.source_links(link_type);

-- Grants ----------------------------------------------------------------

grant select, insert, update, delete on public.source_titles to authenticated;
grant select, insert, update, delete on public.source_abstracts to authenticated;
grant select, insert, update, delete on public.source_links to authenticated;

grant select on public.source_titles to anon;
grant select on public.source_abstracts to anon;
grant select on public.source_links to anon;

grant all on public.source_titles to service_role;
grant all on public.source_abstracts to service_role;
grant all on public.source_links to service_role;

-- RLS -----------------------------------------------------------------------

alter table public.source_titles     enable row level security;
alter table public.source_abstracts  enable row level security;
alter table public.source_links      enable row level security;

create policy "owner full access source_titles" on public.source_titles
  for all using (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()));
create policy "public read source_titles" on public.source_titles
  for select using (exists (select 1 from public.sources s where s.id = source_id and s.is_public = true));
create policy "public read source_titles via public project" on public.source_titles
  for select using (
    exists (
      select 1 from public.project_sources ps
      join public.projects p on p.id = ps.project_id
      where ps.source_id = source_titles.source_id and p.is_public = true
    )
  );

create policy "owner full access source_abstracts" on public.source_abstracts
  for all using (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()));
create policy "public read source_abstracts" on public.source_abstracts
  for select using (exists (select 1 from public.sources s where s.id = source_id and s.is_public = true));
create policy "public read source_abstracts via public project" on public.source_abstracts
  for select using (
    exists (
      select 1 from public.project_sources ps
      join public.projects p on p.id = ps.project_id
      where ps.source_id = source_abstracts.source_id and p.is_public = true
    )
  );

create policy "owner full access source_links" on public.source_links
  for all using (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()));
create policy "public read source_links" on public.source_links
  for select using (exists (select 1 from public.sources s where s.id = source_id and s.is_public = true));
create policy "public read source_links via public project" on public.source_links
  for select using (
    exists (
      select 1 from public.project_sources ps
      join public.projects p on p.id = ps.project_id
      where ps.source_id = source_links.source_id and p.is_public = true
    )
  );

-- Backfill das 181 fontes já existentes --------------------------------------
-- Zero perda: cada fonte existente ganha sua linha "principal" em
-- source_titles a partir de sources.title/language; source_abstracts/
-- source_links só recebem linha quando o campo legado (abstract/url) já
-- estiver preenchido — nunca cria entrada vazia. Guardas `not exists`
-- deixam o backfill seguro para reexecução.

insert into public.source_titles (source_id, title_text, language, title_type)
select s.id, s.title, s.language, 'principal'
from public.sources s
where not exists (select 1 from public.source_titles st where st.source_id = s.id);

insert into public.source_abstracts (source_id, abstract_text, language)
select s.id, s.abstract, s.language
from public.sources s
where s.abstract is not null and btrim(s.abstract) <> ''
  and not exists (select 1 from public.source_abstracts sa where sa.source_id = s.id);

insert into public.source_links (source_id, url, link_type)
select s.id, s.url, 'pagina'
from public.sources s
where s.url is not null and btrim(s.url) <> ''
  and not exists (select 1 from public.source_links sl where sl.source_id = s.id);
