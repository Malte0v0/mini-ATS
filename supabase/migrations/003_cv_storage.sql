-- 003_cv_storage.sql
-- Private Storage bucket for candidate CVs (PDF only, max 5 MB).
-- Run as postgres in the SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 5 * 1024 * 1024, array['application/pdf']);

-- Files are stored as <owner_id>/<candidate_id>/cv.pdf, so the first folder of
-- the path says which customer owns the file. storage.foldername(name) splits
-- the path into folders; [1] is the first one.
-- Same rule as the tables: the owner or an admin.

create policy "cvs: owner or admin can read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'cvs'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
);

create policy "cvs: owner or admin can upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'cvs'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
);

-- Needed to replace an existing CV (upload with upsert).
create policy "cvs: owner or admin can replace"
on storage.objects for update
to authenticated
using (
  bucket_id = 'cvs'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
)
with check (
  bucket_id = 'cvs'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
);

create policy "cvs: owner or admin can delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'cvs'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
);
