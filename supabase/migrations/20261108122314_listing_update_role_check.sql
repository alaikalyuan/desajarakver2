drop policy "pemilik mengubah listing sendiri" on public.listings;
create policy "pemilik mengubah listing sendiri"
  on public.listings for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and format = 'form'
    and ((kind = 'request' and public.current_role_name() = 'mitra')
      or (kind = 'offer' and public.current_role_name() in ('usaha','bumdes')))
  );
