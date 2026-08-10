-- Storage bucket for source PDFs.
-- Path convention: {owner_id}/{source_id}/{filename}
insert into storage.buckets (id, name, public)
values ('source-pdfs', 'source-pdfs', false)
on conflict (id) do nothing;

create policy "owner full access source-pdfs"
  on storage.objects for all
  using (
    bucket_id = 'source-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'source-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

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
