-- Supabase Storage needs SELECT as well as DELETE on storage.objects before
-- storage.remove() can delete a file. Without this, the existing
-- "hapus foto sendiri" policy never takes effect and owners cannot clean up
-- their own photos. Public reads keep working through the public bucket URL.
create policy "lihat foto sendiri" on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
