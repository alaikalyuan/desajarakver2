-- Profil pengguna (peran tidak bisa diubah sendiri oleh pengguna)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  business_name text,
  phone text,
  role text not null check (role in ('mitra','usaha','bumdes')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profil sendiri dapat dibaca" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profil sendiri dapat diubah" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (full_name, business_name, phone) on public.profiles to authenticated;

create or replace function public.current_role_name() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;
revoke execute on function public.current_role_name() from public, anon;
grant execute on function public.current_role_name() to authenticated;

-- Profil dibuat otomatis saat pendaftaran, dari metadata sign-up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  if requested_role is null or requested_role not in ('mitra','usaha','bumdes') then
    raise exception 'Jenis akun tidak valid';
  end if;
  insert into public.profiles (id, full_name, business_name, phone, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    requested_role
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Permintaan mitra dan penawaran pelaku usaha (data publik produk)
create table public.listings (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid references auth.users(id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('request','offer')),
  status text not null check (status in ('draft','published','sent','accepted','rejected','completed')),
  reference text,
  request_id text,
  format text not null default 'form' check (format in ('form','directory')),
  data jsonb not null default '{}'::jsonb,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_owner_idx on public.listings (owner_id);
create index listings_request_idx on public.listings (request_id);
create index listings_status_idx on public.listings (status);
alter table public.listings enable row level security;

create or replace function public.owns_listing(listing_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings where id = listing_id and owner_id = auth.uid())
$$;
revoke execute on function public.owns_listing(text) from public, anon;
grant execute on function public.owns_listing(text) to authenticated;

create policy "listing publik, milik sendiri, atau penawaran untuk permintaan sendiri dapat dibaca"
  on public.listings for select to anon, authenticated
  using (
    status = 'published'
    or owner_id = (select auth.uid())
    or (kind = 'offer' and request_id is not null and public.owns_listing(request_id))
  );
create policy "mitra membuat permintaan, pelaku usaha membuat penawaran"
  on public.listings for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and format = 'form'
    and ((kind = 'request' and public.current_role_name() = 'mitra')
      or (kind = 'offer' and public.current_role_name() in ('usaha','bumdes')))
  );
create policy "pemilik mengubah listing sendiri"
  on public.listings for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and format = 'form');
create policy "pemilik menghapus listing sendiri"
  on public.listings for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Kontak dipisah: hanya untuk pengguna yang sudah login
create table public.listing_contacts (
  listing_id text primary key references public.listings(id) on delete cascade,
  contact jsonb not null default '{}'::jsonb
);
alter table public.listing_contacts enable row level security;
create policy "kontak dapat dibaca pengguna yang login"
  on public.listing_contacts for select to authenticated
  using (exists (
    select 1 from public.listings l where l.id = listing_id and (
      l.status = 'published' or l.owner_id = (select auth.uid())
      or (l.kind = 'offer' and l.request_id is not null and public.owns_listing(l.request_id))
    )
  ));
create policy "pemilik menyimpan kontak" on public.listing_contacts for insert to authenticated
  with check (public.owns_listing(listing_id));
create policy "pemilik mengubah kontak" on public.listing_contacts for update to authenticated
  using (public.owns_listing(listing_id)) with check (public.owns_listing(listing_id));

-- Analisis Desa: data keuangan dan produksi milik masing-masing pengguna
create table public.transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  tanggal date not null,
  tipe text not null check (tipe in ('pemasukan','pengeluaran')),
  deskripsi text not null,
  harga numeric not null default 0,
  jumlah numeric not null default 0,
  satuan text not null default '',
  keterangan text,
  created_at timestamptz not null default now()
);
create index transactions_user_idx on public.transactions (user_id);
alter table public.transactions enable row level security;
create policy "transaksi milik sendiri" on public.transactions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.productions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  komoditas text not null,
  jumlah numeric not null default 0,
  satuan text not null default '',
  tanggal_tanam date,
  tanggal_panen date,
  keterangan text,
  created_at timestamptz not null default now()
);
create index productions_user_idx on public.productions (user_id);
alter table public.productions enable row level security;
create policy "produksi milik sendiri" on public.productions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Foto penawaran (publik untuk dilihat, unggah hanya ke folder milik sendiri)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 5242880, array['image/jpeg','image/png','image/webp']);
create policy "unggah foto ke folder sendiri" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "hapus foto sendiri" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
