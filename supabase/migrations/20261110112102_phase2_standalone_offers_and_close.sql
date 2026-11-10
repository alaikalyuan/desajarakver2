-- Phase 2 follow-up.
-- An offer made without a target request ("Buat Penawaran Baru") used to be
-- saved as "sent", which RLS hides from everyone but its owner, so it never
-- reached the directory. Such offers are now "published", like requests, and
-- their owner can close them. Offers made to a request stay "sent".

alter table public.listings drop constraint listings_status_check;
alter table public.listings add constraint listings_status_check check (
  (kind = 'request' and status in ('draft', 'published', 'closed'))
  or (kind = 'offer' and status in ('draft', 'published', 'closed', 'sent', 'accepted', 'rejected', 'completed'))
);

create or replace function private.guard_listing_write() returns trigger
language plpgsql set search_path = '' as $$
declare
  first_final text := case
    when new.kind = 'request' or new.request_id is null then 'published'
    else 'sent'
  end;
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
      -- A published listing may be edited ("Ubah"). An offer sent to a
      -- request, or anything closed or decided, keeps its content. The photo
      -- may still be attached.
      if new.data is distinct from old.data and old.status <> 'published' then
        raise exception 'Listing yang sudah dikirim tidak dapat diubah.' using errcode = '42501';
      end if;
    end if;
  end if;

  if new.kind = 'offer' and new.request_id is not null then
    if (tg_op = 'INSERT' or new.request_id is distinct from old.request_id)
       and private.request_status(new.request_id) is null then
      raise exception 'Permintaan tujuan tidak ditemukan.' using errcode = '23503';
    end if;
    if new.status = 'sent'
       and (tg_op = 'INSERT' or old.status = 'draft')
       and private.request_status(new.request_id) is distinct from 'published' then
      raise exception 'Permintaan ini sudah ditutup dan tidak menerima penawaran.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop function public.close_request(text);

-- The owner closes their own published request or directory offer; it leaves
-- the directory.
create or replace function public.close_listing(p_listing_id text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  update public.listings
     set status = 'closed', updated_at = now()
   where id = p_listing_id
     and status = 'published'
     and format = 'form'
     and owner_id = auth.uid();
  if not found then
    raise exception 'Listing tidak ditemukan atau sudah ditutup.' using errcode = 'P0002';
  end if;
  return 'closed';
end;
$$;
revoke execute on function public.close_listing(text) from public, anon;
grant execute on function public.close_listing(text) to authenticated;
