-- Allow public read of a source (and its people/keywords/tags) when it belongs
-- to a public project, even if the source itself isn't individually public.
-- Without this, sharing a project's link would silently hide member sources
-- that the owner hasn't also marked as is_public on the source record.

create policy "public read sources via public project" on public.sources
  for select using (
    exists (
      select 1 from public.project_sources ps
      join public.projects p on p.id = ps.project_id
      where ps.source_id = sources.id and p.is_public = true
    )
  );

create policy "public read source_people via public project" on public.source_people
  for select using (
    exists (
      select 1 from public.project_sources ps
      join public.projects p on p.id = ps.project_id
      where ps.source_id = source_people.source_id and p.is_public = true
    )
  );

create policy "public read source_keywords via public project" on public.source_keywords
  for select using (
    exists (
      select 1 from public.project_sources ps
      join public.projects p on p.id = ps.project_id
      where ps.source_id = source_keywords.source_id and p.is_public = true
    )
  );

create policy "public read source_tags via public project" on public.source_tags
  for select using (
    exists (
      select 1 from public.project_sources ps
      join public.projects p on p.id = ps.project_id
      where ps.source_id = source_tags.source_id and p.is_public = true
    )
  );

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
