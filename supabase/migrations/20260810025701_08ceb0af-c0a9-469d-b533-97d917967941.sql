create extension if not exists "pgcrypto";

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
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_sources_owner on public.sources(owner_id);
create index idx_sources_chave_doc on public.sources(chave_doc);
create index idx_sources_year on public.sources(year);
create index idx_sources_type on public.sources(source_type);
create index idx_sources_duplicate_group on public.sources(duplicate_group_id);

create table public.people (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) default auth.uid(),
  full_name         text not null,
  normalized_name   text generated always as (lower(trim(full_name))) stored
);
create unique index idx_people_owner_normalized on public.people(owner_id, normalized_name);

create table public.source_people (
  source_id   uuid not null references public.sources(id) on delete cascade,
  person_id   uuid not null references public.people(id) on delete cascade,
  role        text not null default 'autor'
                check (role in ('autor','orientador','coorientador','organizador',
                       'tradutor','ilustrador')),
  position    int not null default 1,
  primary key (source_id, person_id, role)
);
create index idx_source_people_person on public.source_people(person_id);
create index idx_source_people_role on public.source_people(role);

create table public.keywords (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users(id) default auth.uid(),
  label              text not null,
  normalized_label   text generated always as (lower(trim(label))) stored
);
create unique index idx_keywords_owner_normalized on public.keywords(owner_id, normalized_label);

create table public.source_keywords (
  source_id    uuid not null references public.sources(id) on delete cascade,
  keyword_id   uuid not null references public.keywords(id) on delete cascade,
  primary key (source_id, keyword_id)
);
create index idx_source_keywords_keyword on public.source_keywords(keyword_id);

create table public.tags (
  id       uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  label    text not null,
  color    text
);
create unique index idx_tags_owner_label on public.tags(owner_id, label);

create table public.source_tags (
  source_id  uuid not null references public.sources(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  primary key (source_id, tag_id)
);
create index idx_source_tags_tag on public.source_tags(tag_id);

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) default auth.uid(),
  name         text not null,
  description  text,
  is_public    boolean not null default false,
  public_slug  text unique,
  created_at   timestamptz not null default now()
);

create table public.project_sources (
  project_id  uuid not null references public.projects(id) on delete cascade,
  source_id   uuid not null references public.sources(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (project_id, source_id)
);
create index idx_project_sources_source on public.project_sources(source_id);

create table public.user_preferences (
  owner_id           uuid primary key references auth.users(id) default auth.uid(),
  visible_columns    jsonb not null default '[]'::jsonb,
  updated_at         timestamptz not null default now()
);

-- Data API grants
grant select, insert, update, delete on public.sources to authenticated;
grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.source_people to authenticated;
grant select, insert, update, delete on public.keywords to authenticated;
grant select, insert, update, delete on public.source_keywords to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.source_tags to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_sources to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

grant select on public.sources to anon;
grant select on public.source_people to anon;
grant select on public.people to anon;
grant select on public.source_keywords to anon;
grant select on public.keywords to anon;
grant select on public.projects to anon;
grant select on public.project_sources to anon;

grant all on public.sources to service_role;
grant all on public.people to service_role;
grant all on public.source_people to service_role;
grant all on public.keywords to service_role;
grant all on public.source_keywords to service_role;
grant all on public.tags to service_role;
grant all on public.source_tags to service_role;
grant all on public.projects to service_role;
grant all on public.project_sources to service_role;
grant all on public.user_preferences to service_role;

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_sources_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

alter table public.sources           enable row level security;
alter table public.people            enable row level security;
alter table public.source_people     enable row level security;
alter table public.keywords          enable row level security;
alter table public.source_keywords   enable row level security;
alter table public.tags              enable row level security;
alter table public.source_tags       enable row level security;
alter table public.projects          enable row level security;
alter table public.project_sources   enable row level security;
alter table public.user_preferences  enable row level security;

create policy "owner full access sources" on public.sources
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "public read sources" on public.sources
  for select using (is_public = true);

create policy "owner full access people" on public.people
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "public read people" on public.people
  for select using (exists (
    select 1 from public.source_people sp
    join public.sources s on s.id = sp.source_id
    where sp.person_id = people.id and s.is_public = true
  ));
create policy "owner full access keywords" on public.keywords
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "public read keywords" on public.keywords
  for select using (exists (
    select 1 from public.source_keywords sk
    join public.sources s on s.id = sk.source_id
    where sk.keyword_id = keywords.id and s.is_public = true
  ));
create policy "owner full access tags" on public.tags
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "owner full access source_people" on public.source_people
  for all using (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()));
create policy "public read source_people" on public.source_people
  for select using (exists (select 1 from public.sources s where s.id = source_id and s.is_public = true));

create policy "owner full access source_keywords" on public.source_keywords
  for all using (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()));
create policy "public read source_keywords" on public.source_keywords
  for select using (exists (select 1 from public.sources s where s.id = source_id and s.is_public = true));

create policy "owner full access source_tags" on public.source_tags
  for all using (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sources s where s.id = source_id and s.owner_id = auth.uid()));

create policy "owner full access projects" on public.projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "public read projects" on public.projects
  for select using (is_public = true);

create policy "owner full access project_sources" on public.project_sources
  for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "public read project_sources" on public.project_sources
  for select using (exists (select 1 from public.projects p where p.id = project_id and p.is_public = true));

create policy "owner full access user_preferences" on public.user_preferences
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);