-- Reconstrução do schema de `sources` para não perder campos na importação de RIS
-- (título traduzido, resumo multilíngue, ISSN/ISBN, link de PDF direto, base de
-- origem) e tornar tudo filtrável. Poucas fontes cadastradas hoje: reconstrução
-- via DROP/CREATE em vez de ALTER incremental, sem migração de dado existente.
--
-- `sources` é recriada com as colunas novas. `source_people`, `source_keywords`,
-- `source_tags` e `project_sources` referenciam `sources.id` e por isso são
-- derrubadas em cascata pelo DROP abaixo — são recriadas aqui com a MESMA
-- estrutura que já tinham (nenhuma mudança de coluna/constraint nelas), só o
-- papel de pessoa "editor" foi adicionado ao check de source_people.role, que
-- já era necessário para mapear os tags RIS A2/A3 (editor de livro/coletânea).
-- `people`, `keywords`, `tags`, `projects`, `user_preferences` não são tocadas.

drop table if exists public.sources cascade;

create table public.sources (
  id                      uuid primary key default gen_random_uuid(),
  owner_id                uuid not null references auth.users(id) default auth.uid(),
  public_slug             text unique,
  is_public               boolean not null default false,
  source_type             text not null default 'Outro'
                            check (source_type in ('Artigo','Livro','Capítulo de livro','Tese',
                                   'Dissertação','TCC','Anais','Website','Outro')),
  title                   text not null,
  year                    int,
  container_title         text,
  volume                  text,
  issue                   text,
  pages                   text,
  months                  text,
  place                   text,
  publisher               text,
  doi                     text,
  url                     text,
  access_date             date,
  language                text default 'PT' check (language in ('PT','EN','ES','Outro')),
  status_reading          text not null default 'Não lido'
                            check (status_reading in ('Não lido','Em leitura','Lido','Anotado')),
  has_pdf                 boolean not null default false,
  pdf_storage_path        text,
  abstract                text,
  personal_notes          text,
  citation_full_abnt      text,
  citation_integrated     text,
  citation_parenthetical  text,
  color_tag               text,
  is_favorite             boolean not null default false,
  duplicate_group_id      uuid,
  duplicate_status        text default 'Não'
                            check (duplicate_status in ('Não','Revisar','Variante confirmada')),
  chave_doc               text,
  -- Novas colunas: campos de RIS que hoje são descartados na importação.
  issn_isbn               text,      -- tag RIS "SN"
  database_source         text,      -- tag RIS "DB"
  external_id             text,      -- tag RIS "ID"
  raw_import_data         jsonb,     -- registro bruto completo (todas as tags -> valores), sempre gravado
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_sources_owner on public.sources(owner_id);
create index idx_sources_chave_doc on public.sources(chave_doc);
create index idx_sources_year on public.sources(year);
create index idx_sources_type on public.sources(source_type);
create index idx_sources_duplicate_group on public.sources(duplicate_group_id);
create index idx_sources_database_source on public.sources(database_source);

-- Recriação idêntica (derrubada em cascata pelo DROP de sources acima)

create table public.source_people (
  source_id   uuid not null references public.sources(id) on delete cascade,
  person_id   uuid not null references public.people(id) on delete cascade,
  role        text not null default 'autor'
                check (role in ('autor','orientador','coorientador','organizador',
                       'tradutor','ilustrador','editor')),
  position    int not null default 1,
  primary key (source_id, person_id, role)
);
create index idx_source_people_person on public.source_people(person_id);
create index idx_source_people_role on public.source_people(role);

create table public.source_keywords (
  source_id    uuid not null references public.sources(id) on delete cascade,
  keyword_id   uuid not null references public.keywords(id) on delete cascade,
  primary key (source_id, keyword_id)
);
create index idx_source_keywords_keyword on public.source_keywords(keyword_id);

create table public.source_tags (
  source_id  uuid not null references public.sources(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  primary key (source_id, tag_id)
);
create index idx_source_tags_tag on public.source_tags(tag_id);

create table public.project_sources (
  project_id  uuid not null references public.projects(id) on delete cascade,
  source_id   uuid not null references public.sources(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (project_id, source_id)
);
create index idx_project_sources_source on public.project_sources(source_id);

-- Tabelas novas -------------------------------------------------------------

-- Títulos alternativos/traduzidos (tag RIS "TT", pode repetir). A entrada
-- "principal" (tag "TI", que também é gravada em sources.title) também vira
-- uma linha aqui, com title_type = 'principal'.
create table public.source_titles (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references public.sources(id) on delete cascade,
  title_text  text not null,
  language    text,
  title_type  text not null default 'traduzido' check (title_type in ('principal','traduzido')),
  created_at  timestamptz not null default now()
);
create index idx_source_titles_source on public.source_titles(source_id);

-- Resumos em múltiplos idiomas (tag RIS "AB", pode repetir).
create table public.source_abstracts (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid not null references public.sources(id) on delete cascade,
  abstract_text text not null,
  language      text,
  created_at    timestamptz not null default now()
);
create index idx_source_abstracts_source on public.source_abstracts(source_id);

-- Links múltiplos (tag RIS "UR" + "L1"-"L4": página, PDF direto, etc.)
create table public.source_links (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references public.sources(id) on delete cascade,
  url         text not null,
  link_type   text not null default 'outro' check (link_type in ('pagina','pdf_direto','outro')),
  label       text,
  created_at  timestamptz not null default now()
);
create index idx_source_links_source on public.source_links(source_id);
create index idx_source_links_type on public.source_links(link_type);

-- Grants ----------------------------------------------------------------

grant select, insert, update, delete on public.sources to authenticated;
grant select, insert, update, delete on public.source_people to authenticated;
grant select, insert, update, delete on public.source_keywords to authenticated;
grant select, insert, update, delete on public.source_tags to authenticated;
grant select, insert, update, delete on public.project_sources to authenticated;
grant select, insert, update, delete on public.source_titles to authenticated;
grant select, insert, update, delete on public.source_abstracts to authenticated;
grant select, insert, update, delete on public.source_links to authenticated;

grant select on public.sources to anon;
grant select on public.source_people to anon;
grant select on public.source_keywords to anon;
grant select on public.project_sources to anon;
grant select on public.source_titles to anon;
grant select on public.source_abstracts to anon;
grant select on public.source_links to anon;

grant all on public.sources to service_role;
grant all on public.source_people to service_role;
grant all on public.source_keywords to service_role;
grant all on public.source_tags to service_role;
grant all on public.project_sources to service_role;
grant all on public.source_titles to service_role;
grant all on public.source_abstracts to service_role;
grant all on public.source_links to service_role;

-- Trigger updated_at (função já existe, criada na migration original) -----

create trigger trg_sources_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

-- RLS -----------------------------------------------------------------------

alter table public.sources           enable row level security;
alter table public.source_people     enable row level security;
alter table public.source_keywords   enable row level security;
alter table public.source_tags       enable row level security;
alter table public.project_sources   enable row level security;
alter table public.source_titles     enable row level security;
alter table public.source_abstracts  enable row level security;
alter table public.source_links      enable row level security;

create policy "owner full access sources" on public.sources
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "public read sources" on public.sources
  for select using (is_public = true);
create policy "public read sources via public project" on public.sources
  for select using (
    exists (
      select 1 from public.project_sources ps
      join public.projects p on p.id = ps.project_id
      where ps.source_id = sources.id and p.is_public = true
    )
  );

create policy "owner full access source_people" on public.source_people
  for all using (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()));
create policy "public read source_people" on public.source_people
  for select using (exists (select 1 from public.sources s where s.id = source_id and s.is_public = true));
create policy "public read source_people via public project" on public.source_people
  for select using (
    exists (
      select 1 from public.project_sources ps
      join public.projects p on p.id = ps.project_id
      where ps.source_id = source_people.source_id and p.is_public = true
    )
  );

create policy "owner full access source_keywords" on public.source_keywords
  for all using (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()));
create policy "public read source_keywords" on public.source_keywords
  for select using (exists (select 1 from public.sources s where s.id = source_id and s.is_public = true));
create policy "public read source_keywords via public project" on public.source_keywords
  for select using (
    exists (
      select 1 from public.project_sources ps
      join public.projects p on p.id = ps.project_id
      where ps.source_id = source_keywords.source_id and p.is_public = true
    )
  );

create policy "owner full access source_tags" on public.source_tags
  for all using (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()));
create policy "public read source_tags via public project" on public.source_tags
  for select using (
    exists (
      select 1 from public.project_sources ps
      join public.projects p on p.id = ps.project_id
      where ps.source_id = source_tags.source_id and p.is_public = true
    )
  );

create policy "owner full access project_sources" on public.project_sources
  for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "public read project_sources" on public.project_sources
  for select using (exists (select 1 from public.projects p where p.id = project_id and p.is_public = true));

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

-- Reataches: DROP TABLE sources CASCADE também derruba, em cascata,
-- políticas em OUTRAS tabelas que fazem referência a source_people/
-- source_keywords/source_tags/sources dentro do seu USING — mesmo essas
-- tabelas (people/keywords/tags) não tendo nenhuma coluna alterada. Sem
-- recriar as políticas abaixo, leitura pública de pessoa/palavra-chave/tag
-- vinculada a uma fonte ou projeto público quebraria silenciosamente.

create policy "public read people" on public.people
  for select using (exists (
    select 1 from public.source_people sp
    join public.sources s on s.id = sp.source_id
    where sp.person_id = people.id and s.is_public = true
  ));
create policy "public read people via public project" on public.people
  for select using (
    exists (
      select 1
      from public.source_people sp
      join public.project_sources ps on ps.source_id = sp.source_id
      join public.projects p on p.id = ps.project_id
      where sp.person_id = people.id and p.is_public = true
    )
  );

create policy "public read keywords" on public.keywords
  for select using (exists (
    select 1 from public.source_keywords sk
    join public.sources s on s.id = sk.source_id
    where sk.keyword_id = keywords.id and s.is_public = true
  ));
create policy "public read keywords via public project" on public.keywords
  for select using (
    exists (
      select 1
      from public.source_keywords sk
      join public.project_sources ps on ps.source_id = sk.source_id
      join public.projects p on p.id = ps.project_id
      where sk.keyword_id = keywords.id and p.is_public = true
    )
  );

create policy "public read tags via public project" on public.tags
  for select using (
    exists (
      select 1
      from public.source_tags st
      join public.project_sources ps on ps.source_id = st.source_id
      join public.projects p on p.id = ps.project_id
      where st.tag_id = tags.id and p.is_public = true
    )
  );

-- Idem para a política de Storage do bucket source-pdfs, que referencia
-- public.sources diretamente no USING.
create policy "public read source-pdfs"
  on storage.objects for select
  using (
    bucket_id = 'source-pdfs'
    and exists (
      select 1 from public.sources s
      where s.pdf_storage_path = storage.objects.name
        and s.is_public = true
    )
  );
