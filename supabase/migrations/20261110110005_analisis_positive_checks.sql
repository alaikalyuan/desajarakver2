-- Phase 1, item 1.2: database backstop for the analisis forms.
-- The UI already refuses empty, zero and negative numbers; these checks stop
-- a bad row even if it gets past the UI (old app version, direct API call).
-- No existing row broke these rules when this was applied (2026-11-10), so the
-- checks cover all rows, old and new.

alter table public.transactions
  add constraint transactions_jumlah_positive check (jumlah > 0),
  add constraint transactions_harga_not_negative check (harga >= 0);

alter table public.productions
  add constraint productions_jumlah_positive check (jumlah > 0),
  add constraint productions_panen_after_tanam
    check (tanggal_panen is null or tanggal_tanam is null or tanggal_panen >= tanggal_tanam);
