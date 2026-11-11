-- Phase 2A of docs/fix-roadmap-2026-11.md
--   2.1  status is controlled by the server, not the browser
--   2.2  request_id must point at a real, open request
--   2.3  contacts are readable only by the owner, by someone who pressed
--        "Nyatakan Minat" (rate limited), or by the other side of an
--        accepted offer (decision D2)
--   2.9  "Nyatakan Minat" is recorded
--   2.10 one sent offer per seller per request

-- Statuses per kind. Requests: draft -> published -> closed.
-- Offers: draft -> sent -> accepted | rejected (-> completed).
-- "published" offers are the seeded directory rows.
alter table public.listings drop constraint listings_status_check;
alter table public.listings add constraint listings_status_check check (
  (kind = 'request' and status in ('draft', 'published', 'closed'))
  or (kind = 'offer' and status in ('draft', 'published', 'sent', 'accepted', 'rejected', 'completed'))
);
alter table public.listings add constraint listings_request_id_only_on_offers
  check (kind = 'offer' or request_id is null);
alter table public.listings add constraint listings_request_id_fkey
  foreign key (request_id) references public.listings(id) on delete set null;

create unique index listings_one_offer_per_request
  on public.listings (owner_id, request_id)
  where kind = 'offer' and status <> 'draft' and request_id is not null;

-- Reads the target request without the caller's RLS.
create or replace function private.request_status(target_id text) returns text
language sql stable security definer set search_path = '' as $$
  select status from public.listings where id = target_id and kind = 'request'
$$;
revoke execute on function private.request_status(text) from public, anon;
grant execute on function private.request_status(text) to authenticated;

-- Not SECURITY DEFINER on purpose: current_user is 'authenticated' for
-- browser writes, and the table owner inside the RPCs below, which are the
-- only way to move a listing past its first status.
create or replace function private.guard_listing_write() returns trigger
language plpgsql set search_path = '' as $$
declare
  first_final text := case when new.kind = 'request' then 'published' else 'sent' end;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.format = 'form' then
    new.data := new.data - 'status';
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', first_final) then
      raise exception 'Status awal listing tidak valid.' using errcode = '42501';
    end if;
  else
    if new.kind <> old.kind then
      raise exception 'Jenis listing tidak dapat diubah.' using errcode = '42501';
    end if;

    if old.status = 'draft' then
      if new.status not in ('draft', first_final) then
        raise exception 'Status listing tidak valid.' using errcode = '42501';
      end if;
    else
      if new.status <> old.status then
        raise exception 'Status hanya dapat diubah lewat tombol di dasbor.' using errcode = '42501';
      end if;
      if new.request_id is distinct from old.request_id then
        raise exception 'Permintaan tujuan tidak dapat diubah.' using errcode = '42501';
      end if;
      -- A published request may be edited ("Ubah"); anything else that has
      -- left draft keeps its content. The photo may still be attached.
      if new.data is distinct from old.data
         and not (old.kind = 'request' and old.status = 'published') then
        raise exception 'Listing yang sudah dikirim tidak dapat diubah.' using errcode = '42501';
      end if;
    end if;
  end if;

  if new.kind = 'offer' and new.request_id is not null then
    if (tg_op = 'INSERT' or new.request_id is distinct from old.request_id)
       and private.request_status(new.request_id) is null then
      raise exception 'Permintaan tujuan tidak ditemukan.' using errcode = '23503';
    end if;
    if new.status = first_final
       and (tg_op = 'INSERT' or old.status = 'draft')
       and private.request_status(new.request_id) is distinct from 'published' then
      raise exception 'Permintaan ini sudah ditutup dan tidak menerima penawaran.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;
revoke execute on function private.guard_listing_write() from public, anon, authenticated;

create trigger listings_guard_write
  before insert or update on public.listings
  for each row execute function private.guard_listing_write();

-- "Nyatakan Minat"
create table public.listing_interests (
  listing_id text not null references public.listings(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);
create index listing_interests_user_created_idx
  on public.listing_interests (user_id, created_at);
alter table public.listing_interests enable row level security;
revoke all on public.listing_interests from anon, authenticated;
grant select on public.listing_interests to authenticated;
create policy "minat sendiri dapat dibaca" on public.listing_interests
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function private.can_read_contact(target_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select
    exists (select 1 from public.listings l
            where l.id = target_id and l.owner_id = auth.uid())
    or exists (select 1 from public.listing_interests i
               where i.listing_id = target_id and i.user_id = auth.uid())
    -- the buyer sees the contact of an offer they accepted
    or exists (select 1 from public.listings o
               join public.listings r on r.id = o.request_id
               where o.id = target_id
                 and o.status in ('accepted', 'completed')
                 and r.owner_id = auth.uid())
    -- the seller sees the buyer's contact once their offer is accepted
    or exists (select 1 from public.listings o
               where o.request_id = target_id
                 and o.owner_id = auth.uid()
                 and o.status in ('accepted', 'completed'))
$$;
revoke execute on function private.can_read_contact(text) from public, anon;
grant execute on function private.can_read_contact(text) to authenticated;

drop policy "kontak dapat dibaca pengguna yang login" on public.listing_contacts;
create policy "kontak dapat dibaca pemilik, peminat, atau pihak yang sepakat"
  on public.listing_contacts for select to authenticated
  using (private.can_read_contact(listing_id));
create policy "pemilik menghapus kontak" on public.listing_contacts
  for delete to authenticated using (private.owns_listing(listing_id));

-- Records interest (max 10 new listings per user per 24 hours) and returns
-- the listing's contact. Repeat calls on the same listing are free.
create or replace function public.express_interest(p_listing_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  target public.listings%rowtype;
  recent integer;
  result jsonb;
begin
  if uid is null then
    raise exception 'Silakan masuk terlebih dahulu.' using errcode = '42501';
  end if;

  select * into target from public.listings where id = p_listing_id;
  if not found or (target.status <> 'published' and target.owner_id is distinct from uid) then
    raise exception 'Listing ini tidak tersedia lagi.' using errcode = 'P0002';
  end if;

  if target.owner_id is distinct from uid
     and not exists (select 1 from public.listing_interests
                     where listing_id = p_listing_id and user_id = uid) then
    perform pg_advisory_xact_lock(hashtext('interest:' || uid::text));
    select count(*) into recent from public.listing_interests
      where user_id = uid and created_at > now() - interval '1 day';
    if recent >= 10 then
      raise exception 'Anda sudah menyatakan minat pada 10 listing dalam 24 jam terakhir. Coba lagi besok.'
        using errcode = '54000';
    end if;
    insert into public.listing_interests (listing_id, user_id) values (p_listing_id, uid);
  end if;

  select contact into result from public.listing_contacts where listing_id = p_listing_id;
  return coalesce(result, '{}'::jsonb);
end;
$$;

-- Everyone who expressed interest in the caller's listings, with the name
-- and phone they registered with (the UI tells them this before they tap).
create or replace function public.my_listing_interests()
returns table (listing_id text, full_name text, business_name text, phone text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.listing_id, p.full_name, p.business_name, p.phone, i.created_at
  from public.listing_interests i
  join public.listings l on l.id = i.listing_id and l.owner_id = auth.uid()
  join public.profiles p on p.id = i.user_id
  order by i.created_at desc
$$;

-- The buyer accepts or rejects an offer sent to one of their requests.
create or replace function public.respond_to_offer(p_offer_id text, p_decision text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if p_decision not in ('accepted', 'rejected') then
    raise exception 'Pilihan tidak valid.' using errcode = '22023';
  end if;

  update public.listings o
     set status = p_decision, updated_at = now()
   where o.id = p_offer_id
     and o.kind = 'offer'
     and o.status = 'sent'
     and exists (select 1 from public.listings r
                 where r.id = o.request_id and r.owner_id = auth.uid());
  if not found then
    raise exception 'Penawaran tidak ditemukan atau sudah ditanggapi.' using errcode = 'P0002';
  end if;
  return p_decision;
end;
$$;

-- The buyer closes their own published request; it leaves the directory.
create or replace function public.close_request(p_request_id text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  update public.listings
     set status = 'closed', updated_at = now()
   where id = p_request_id
     and kind = 'request'
     and status = 'published'
     and owner_id = auth.uid();
  if not found then
    raise exception 'Permintaan tidak ditemukan atau sudah ditutup.' using errcode = 'P0002';
  end if;
  return 'closed';
end;
$$;

revoke execute on function public.express_interest(text) from public, anon;
revoke execute on function public.my_listing_interests() from public, anon;
revoke execute on function public.respond_to_offer(text, text) from public, anon;
revoke execute on function public.close_request(text) from public, anon;
grant execute on function public.express_interest(text) to authenticated;
grant execute on function public.my_listing_interests() to authenticated;
grant execute on function public.respond_to_offer(text, text) to authenticated;
grant execute on function public.close_request(text) to authenticated;
