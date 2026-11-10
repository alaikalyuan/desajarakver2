# Desa Jarak: fix roadmap

This roadmap is based on [audit-report-2026-11-10.md](audit-report-2026-11-10.md). Section references (§) point to that report.

## How to read this

The work is split into five phases. Each phase leaves the site better for real villagers and can ship on its own. The order is set by three questions, asked in turn:

1. Does it hurt users today (speed, fake data, wrong numbers, security)?
2. Does other work depend on it?
3. How much does it cost?

**Effort**

| Size | Time |
|---|---|
| **S** | Under half a day |
| **M** | 1–3 days |
| **L** | 1–2 weeks |

Times assume one developer who knows the codebase.

**Done when** is the check that proves an item is finished. Use it as the test before closing the item.

| Phase | Theme | Rough size | Outcome |
|---|---|---|---|
| 0 | Hotfixes | ~2 days | Pages load about 6× faster; no security hole or fake data in front of users |
| 1 | Correct numbers and honest UI | ~1 week | Every number shown is right; every button either works or is gone |
| 2 | Close the buyer–seller loop safely | ~2–3 weeks | A deal can go from request to accepted offer to contact, and contacts are protected |
| 3 | Mobile-first and simpler | ~2–3 weeks | Dashboards and forms are comfortable at 360 px on 3G |
| 4 | Inclusion and scale | ~4–6 weeks | Villagers without email can join; the site works offline; the data model is clean |

---

## Decisions needed before or during the work

Some items cannot be built until the owner decides. Each decision is listed with the phase that needs it.

| # | Decision | Needed by | Blocks |
|---|---|---|---|
| D1 | The real WhatsApp help number (village office or admin) | Phase 0 | 0.5 |
| D2 | When contacts become visible: after an offer is accepted, after "Nyatakan Minat", or on request with a limit | Phase 2 | 2.3 |
| D3 | Final words for the two roles, e.g. **Pembeli** and **Penjual** | Phase 3 | 3.6 (plain-language pass) |
| D4 | What "BUMDes/KDMP" means, and whether it needs admin verification | Phase 4 | 4.2 |
| D5 | Budget and provider for phone or WhatsApp OTP (SMS costs money per message) | Phase 4 | 4.1 |

---

## Phase 0: Hotfixes (about 2 days)

Ship these as one release, as soon as possible. Each item is small and independent.

| # | Item | Size | Where | Done when |
|---|---|---|---|---|
| 0.1 | **Shrink the logo.** Use one ~10 KB WebP/PNG at 2× display size (the analisis pages already have an 11 KB one) and remove the `preload`. | S | `public/assets/Logo Desa Jarak.png`; `components/navbar.tsx:105-111`; `app/mitra/page.tsx:286`; `app/usaha/page.tsx:310` | Home transfers under 400 KB in total; no image over 100 KB on any page |
| 0.2 | **Compress the login/register background** to under 60 KB, or hide it below 768 px. | S | `public/assets/login.desa.png`; `app/masuk/login.css:41`; `app/daftar/daftar.css:34` | `/masuk` transfers under 400 KB in total |
| 0.3 | **Fix the open redirect.** Accept `next` only if `new URL(next, origin).origin === origin`. | S | `app/auth/callback/route.ts:58-75` | `next=/\evil.test` and `next=//evil.test` both land on `/` |
| 0.4 | **Remove fake data** from `/usaha`: delete `SAMPLE_TAB_DATA` and the hardcoded "3"/"2" badges. Hide the "Pesan" and "Dokumen" tabs, or show an honest empty state ("Belum ada pesan"). | S | `app/usaha/page.tsx:32-157, 61-62, 362, 376` | A new usaha account sees no made-up companies, messages or contracts |
| 0.5 | **Replace the placeholder WhatsApp number** with the real one (D1). Put it in one constant so the footer and help page can reuse it later. | S | `components/analisis/sidebar.tsx:34` | The link opens the real village contact |
| 0.6 | **Fix the price display**: show the seller's `priceNote` as written, with no digit stripping and no hardcoded "/ Kg". | S | `app/mitra/page.tsx:58, 143-145` | "Rp11.800 - Rp12.300/kg" shows exactly like that |
| 0.7 | **Add a mobile logout** to the `/usaha` topbar and the analisis top nav. | S | `app/usaha/usaha-dashboard.css:513-515`; `components/analisis/top-nav.tsx` | At 360 px, "Keluar" is reachable from `/usaha`, `/usaha/analisis`, `/input-harga` and `/produksi` |
| 0.8 | **Clean up storage.** Add an owner SELECT policy on `storage.objects` for `listing-photos` (as a migration), then delete the 3 audit photos and the 4 older orphans from the dashboard. | S | new migration in `supabase/migrations/` | An owner can `storage.remove()` their own file; the bucket holds only files linked from a listing |
| 0.9 | **Cache static assets.** Serve `/assets/*` with a long `Cache-Control`, e.g. through `headers()` in `next.config`, and rename files when they change. | S | `next.config.*` | A repeat visit makes no image requests |

**Release check for Phase 0:** load `/`, `/direktori` and `/masuk` at 360 px and record the transfer sizes. Log in as each role and confirm that logout works on a phone.

---

## Phase 1: Correct numbers and honest UI (about 1 week)

The goal is that nothing on screen is wrong or pretends to work.

### 1A. One number input, used everywhere

Do this first. The wizard and both analisis forms depend on it.

| # | Item | Size | Where | Done when |
|---|---|---|---|---|
| 1.1 | Build a shared `NumberInput`: `type="text" inputMode="decimal"`. It turns "2,5" into 2.5, rejects values ≤ 0, and shows "Masukkan angka lebih dari 0". Use it in the wizard, input-harga and produksi. | M | new `components/forms/number-input.tsx`; `form-wizard.tsx:746-754`; `input-harga/page.tsx:238-245`; `produksi/page.tsx:152-159` | "2,5" saves as 2.5; "-5", "0" and "" are refused with a message, on Android Chrome with an Indonesian keyboard |
| 1.2 | Validate on save: in edit mode an empty price is an error, not Rp 0. Add a DB `CHECK (jumlah > 0 AND harga >= 0)` as a backstop. | S | `input-harga/page.tsx:55-66, 95-112`; migration | A negative row is rejected by the database even if it gets past the UI |
| 1.3 | Use the local date (WIB) for date defaults instead of `toISOString()`. Reject a harvest date that is earlier than the planting date. | S | `input-harga/page.tsx:25-27`; `produksi/page.tsx:26-31, 49-72` | At 01:00 WIB the default date is today |

### 1B. Analisis numbers

| # | Item | Size | Where | Done when |
|---|---|---|---|---|
| 1.4 | **Units.** Group totals by satuan, or convert ton and kuintal to kg and show other units separately. Compute HPP per commodity and unit. Remove the hardcoded "kg" and "Rp/kg". | M | `app/usaha/analisis/page.tsx:218-226, 259-264, 437-443, 691, 697, 731` | 20 kg + 2.5 ton shows as 2.520 kg; "1 unit" is never added to kg |
| 1.5 | **Remove the fake "Target" series** (or build real targets later). | S | `page.tsx:578-579, 606-607, 634-635`; `bar-chart-card.tsx:81-87` | Charts show one series per metric |
| 1.6 | **One Rupiah formatter** (`lib/format.ts`) for KPI cards, axes, donut and tooltips: "Rp 15 jt", "Rp 1,2 M", always with id-ID separators. | S | `finance-trend.tsx:40`; `kpi-cards.tsx:18-26`; `revenue-donut.tsx:59-61`; `bar-chart-card.tsx:57, 65-67` | No "0 jt", "1.0M", "1015.5 jt" or "12.000 Rp" anywhere |
| 1.7 | Use the same asset rule for the "Total Biaya" KPI and the Pengeluaran chart. | S | `page.tsx:214-216, 375-392` | The KPI and the chart total match |
| 1.8 | **Confirm before delete** ("Hapus transaksi ini?") and use 44 px icon buttons. | S | `input-harga/page.tsx:81-88, 461-477`; `produksi/page.tsx:74-81, 337-353` | Delete needs two taps; the buttons are at least 44×44 px |
| 1.9 | Load analisis data once (merge the two effects that call `loadCombinedData()`). | S | `app/usaha/analisis/page.tsx:166-458` | One set of Supabase requests per visit |

### 1C. Honest buttons and fallbacks

| # | Item | Size | Where | Done when |
|---|---|---|---|---|
| 1.10 | Make "Hubungi Penawar" and every shown phone number a `https://wa.me/62…` or `tel:` link. | S | `mitra/page.tsx:621-631`; directory modal | One tap opens WhatsApp with the number filled in |
| 1.11 | Hide "Unduh" and "Buka Pesan" until they work. Until Phase 2 builds "Nyatakan Minat", make it open a WhatsApp link to the listing's contact. | S | `usaha/page.tsx:549-563`; `direktori-client.tsx:1371-1387` | No button only shows a toast |
| 1.12 | Remove fallbacks that look like real data: `DEFAULT_TARGET_REQUEST`, the default price "Rp13.000 - Rp15.100", the "Jasa Pertanian" label on every photo-less offer, and "Kelompok Tani Makmur" as the default name. Show "—" or a neutral placeholder. | S | `lib/forms/domain.ts:74-100`; `lib/listings.ts:317, 572-588`; `direktori-client.tsx:1321`; `analisis/page.tsx:40` | Empty fields never show invented names or prices |
| 1.13 | Do not prefill the offer location ("Dusun Krajan") or position ("Koordinator Pasokan"). | S | `lib/forms/form-flow.ts:336-342` | Both fields start empty |
| 1.14 | Mark requests past their deadline as "Ditutup" and disable "Ajukan Penawaran" on them. | S | `direktori-client.tsx:895-897, 957` | The Tebu request (due 20 Okt 2026) shows as closed |
| 1.15 | Fix the "Penawaran Masuk" empty state ("Belum ada penawaran untuk permintaan Anda") and the "Jenis" filter's substring matching. | S | `/mitra`; `direktori-client.tsx:155-201` | Fresh crops no longer appear under "Produk Olahan" |
| 1.16 | Add Indonesian `not-found.tsx`, `error.tsx` and `global-error.tsx`. | S | `app/` | `/xyz` shows "Halaman tidak ditemukan" with a link home |

**Release check for Phase 1:** re-run the analisis scenario from the audit (20 kg + 2.5 ton + 1 unit; −5 × Rp −1.000; "2,5") and the price-range scenario on `/mitra`. Every result must be correct or refused.

---

## Phase 2: Close the buyer–seller loop, safely (about 2–3 weeks)

This phase turns the site from a notice board into a working marketplace. The security items come first, because the new features rely on them.

### 2A. Lock down the data (do first)

| # | Item | Size | Where | Done when |
|---|---|---|---|---|
| 2.1 | **Server-controlled status.** Use a trigger or `SECURITY DEFINER` RPCs so that:<br>• an insert may only set `draft` or `published`/`sent`;<br>• only the request owner can set an offer to `accepted` or `rejected`;<br>• only the listing owner can set `closed`.<br>Drop the duplicate `data.status` from the JSON. | M | migration; `lib/listings.ts` | The audit's RLS test (a usaha self-setting `accepted` or `completed`) returns 403 |
| 2.2 | **Valid `request_id`.** Add a foreign key to `listings(id)`, and a check that the target is a published request that is not closed. | S | migration | An offer on a draft or a missing id is rejected |
| 2.3 | **Protect contacts** (D2). Replace the "any logged-in user can read" policy with one that lets a user read a contact only if:<br>• they own the listing; or<br>• they are a party to an accepted offer on it; or<br>• (if D2 says so) they have made a recorded, rate-limited reveal.<br>Update the consent text to say who will see the contacts. | M | migration; `form-wizard.tsx:1155-1161` | A fresh signup reads 0 contact rows |
| 2.4 | **Slow down signups:** Cloudflare Turnstile on `/daftar`, Supabase rate limits, and leaked-password protection turned on. | S | `/daftar`; Supabase auth settings | Scripted signups fail without a token |
| 2.5 | Delete a listing's photo when the photo is replaced or the listing is deleted. Upload the photo **after** the row is saved, so a failed save leaves no orphan file. | S | `lib/listings.ts:636-672, 667-797` | The bucket's object count equals the number of photos linked from listings |
| 2.6 | Let the contact-save retry work after the listing is published (fix the final-status guard). | S | `lib/listings.ts:686-693, 770-784` | A simulated contact failure can be retried successfully |

### 2B. The loop

Depends on 2.1–2.3.

| # | Item | Size | Where | Done when |
|---|---|---|---|---|
| 2.7 | **Terima / Tolak** for the buyer on each incoming offer. The seller sees the new status on `/usaha`. When an offer is accepted, both sides see each other's WhatsApp link. | M | `app/mitra/page.tsx`; `app/usaha/page.tsx`; RPC from 2.1 | Full path: mitra request → usaha offer → mitra accepts → both see contacts and "Diterima" |
| 2.8 | **Tutup permintaan** and **Ubah** for published requests. Open `?entryId=` on a published request in edit mode, not as a blank wizard. | M | `app/mitra/page.tsx`; `form-wizard.tsx:84-86` | A closed request leaves the directory; editing does not create a duplicate |
| 2.9 | **Nyatakan Minat** becomes real: it records interest (a row) and notifies the listing owner on their dashboard. | M | `direktori-client.tsx:1371-1387`; new table or RPC | The owner sees "3 orang tertarik" with names |
| 2.10 | Run the duplicate-offer check at step 1 of the wizard, not at the final step. | S | `lib/listings.ts:695-712` | A second offer on the same request is stopped before any typing |

**Release check for Phase 2:** walk the full deal path twice with fresh accounts, once accepting and once rejecting. Re-run the audit's RLS probes (status, request_id and contact harvesting). All of them should be blocked.

---

## Phase 3: Mobile-first and simpler (about 2–3 weeks)

### 3A. Layout

| # | Item | Size | Where | Done when |
|---|---|---|---|---|
| 3.1 | **Tables become cards below 768 px** on `/mitra`, `/usaha`, input-harga and produksi. Put the date and description first. | M | `mitra-dashboard.css:432-436`; `usaha-dashboard.css`; `input-harga/page.tsx:298` | `scrollWidth === 360` on every dashboard at 360 px |
| 3.2 | Collapse the `/mitra` header into a hamburger menu on mobile. Keep one ☰ button in analisis. | S | `mitra-dashboard.css:13-84`; `top-nav.tsx:14-21, 62-69` | No overlapping text in the header at 360 px |
| 3.3 | **Type and contrast:**<br>• text at least 12 px, labels 13–14 px, inputs 16 px;<br>• darken #888 to about #5a6b5f;<br>• input borders and the focus ring at least 3:1 contrast;<br>• tap targets at least 44 px. | M | `form-wizard.css:14-16`; `direktori-usaha.css:355-383`; global tokens | An axe/Lighthouse contrast and tap-target audit passes on the 5 main pages |
| 3.4 | Accessibility basics:<br>• connect each label to its input with `htmlFor`/`id`;<br>• `aria-live` on error messages and `aria-invalid` on invalid fields;<br>• `<legend>` on radio groups;<br>• `aria-pressed` on the role buttons;<br>• Escape key and focus trap in the modal;<br>• mark required fields. | M | `input-harga`, `produksi`, `masuk`, `daftar`, directory modal | Every input has an accessible name; the modal is usable by keyboard |

### 3B. Simpler flows

| # | Item | Size | Where | Done when |
|---|---|---|---|---|
| 3.5 | **Simpler wizard.** Cut it to 3 steps:<br>• prefill name and phone from the profile;<br>• use pick-lists for unit and frequency;<br>• use a real month/date picker for "Target Mulai Pasok" and "Periode Panen";<br>• focus the first invalid field on error;<br>• autosave to `localStorage` and warn on `beforeunload`;<br>• show network errors in Indonesian. | L | `components/forms/form-wizard.tsx`; `lib/forms/form-flow.ts` | A seller can post an offer in under 2 minutes on a phone; a reload loses nothing |
| 3.6 | **Plain-language pass** using the §4.8 table and the role words from D3. Use one label each for "create request", "waiting" and "completed". | M | all user-facing copy | A grep finds no "Dashboard", "PIC", "HPP" or "peramban" in the UI |
| 3.7 | **Front door.** On the home page:<br>• add "Daftar" to the navbar;<br>• add two cards, "Jual hasil desa Anda" and "Cari hasil desa";<br>• add a short "Cara Kerja" page;<br>• add a footer with the village-office contact. | M | `components/navbar.tsx:133-145`; `app/page.tsx:24-34`; `app/layout.tsx` | A first-time visitor can find registration in one tap from any page |
| 3.8 | **Register and login.**<br>• Move the role explanation above the role buttons.<br>• Shrink the hero on mobile so the form is visible.<br>• Remove the role picker from `/masuk` (the account already knows its role).<br>• Use the same minimum password length everywhere.<br>• Trim the password consistently. | M | `app/daftar/page.tsx:281-315, 368-400`; `app/masuk/page.tsx` | The register form is visible without scrolling at 360×780 |
| 3.9 | Analisis onboarding: replace an all-"Rp 0" dashboard with a "Mulai dengan mencatat penjualan pertama" card. Rename "Unduh Laporan (PDF)" to "Cetak laporan" and add totals, laba and HPP to it. Escape user text in the print window. | M | `app/usaha/analisis/page.tsx:508-530`; `kpi-cards.tsx` | A new account sees one clear next step |

### 3C. Speed, round two

| # | Item | Size | Where | Done when |
|---|---|---|---|---|
| 3.10 | **Resize photos on the client** to a 1024 px edge at JPEG quality 0.8 (about 200 KB) and drop the 2.5 MB rejection. Serve thumbnails with Supabase image transforms on cards. | M | `form-wizard.tsx:318-320, 989`; `lib/listings.ts:661` | A 5 MB phone photo uploads as under 300 KB; cards load images under 50 KB |
| 3.11 | **Server-render the dashboards** using the profile the layout already loaded, and add `loading.tsx` skeletons. | M | `app/usaha/page.tsx:192-240`; `app/mitra/page.tsx:82-130` | There is no blank screen; the first paint shows data or a skeleton |
| 3.12 | **Paginate `/direktori`** at 20 items with "Muat lagi", and add a Suspense skeleton. | M | `app/direktori/page.tsx:17-45` | The first HTML stays small as listings grow |
| 3.13 | Keep supabase-js off the home page. Trim Poppins to 2–3 weights. Delete the unused video files. Set a title on every page. | S | build; `app/layout.tsx`; `public/` | Home JS under 180 KB gzipped |

**Release check for Phase 3:** a full pass at 360 px with DevTools "Slow 3G" throttling. Better still, use a real cheap Android phone on a rural connection, which the audit could not test.

---

## Phase 4: Inclusion and scale (about 4–6 weeks; can overlap Phase 3)

| # | Item | Size | Depends on | Done when |
|---|---|---|---|---|
| 4.1 | **Phone or WhatsApp OTP sign-in and recovery** (Supabase phone auth plus an SMS/WA provider, D5). Make email optional. As a stopgap, offer an admin-assisted password reset through the village office. | L | D5 | A villager with no email can register, log in and recover the account with a phone number |
| 4.2 | **BUMDes verification** (D4): a pending state plus an admin approval screen, or merge the role into "Pelaku Usaha". | M | D4 | A self-registered "BUMDes" is not shown as official until approved |
| 4.3 | **PWA:**<br>• a manifest (`lang: id`, `theme_color`, icons);<br>• a service worker that caches the app shell and the last-seen directory;<br>• offline drafts that sync when the connection returns. | L | 3.5 autosave | The site installs to the home screen; the directory opens offline; a draft written offline is saved later |
| 4.4 | **Normalise `listings.data`** into columns: product, quantity, unit, price min/max, deadline, location. Add indexes on `listings(format, kind, status)`, `listings(created_at)` and `transactions(user_id, tanggal)`. Add an `updated_at` trigger. Tighten the default grants. | L | 2.1 (status already moved out) | Directory filters and sorting run in SQL; the price-range bug class can't recur |
| 4.5 | **Field test** with 5–8 real villagers (sellers and buyers) on their own phones. Feed the results into another copy pass. | M | Phases 0–3 shipped | A written list of observed problems, ranked |

---

## Suggested calendar

This assumes one developer starting on Mon 16 Nov 2026. Shift the dates to match your team size.

| Weeks | Work |
|---|---|
| 16–17 Nov | Phase 0 (ship by Wed 18 Nov) |
| 18–27 Nov | Phase 1 |
| 30 Nov – 18 Dec | Phase 2 (2A in the first week, 2B after it) |
| 4–22 Jan 2027 | Phase 3 (after the year-end break) |
| From late Jan 2027 | Phase 4. 4.1 can start earlier if D5 is decided early. |

## Items tracked but not scheduled

These are Low-severity items from the audit. Pick them up when you touch the files nearby.

- Use chevron icons instead of "^"/"v".
- Disable filter options with zero results.
- Change the hamburger icon when the menu is open.
- Add `aria-hidden` to emoji.
- Translate the English `aria-label` "Toggle Menu".
- Fix heading-level skips, and add an `h1` to `/reset-password`.
- Add arrow-key support to the tabs.
- Generate reference codes that cannot collide (`form-flow.ts:529-533`).
- Show the stale draft banner only when a draft exists.
- Make "Lihat di Direktori" link to the item itself.
- Explain the bounce when a user opens another role's page.
- Show the generic duplicate-email message, so it does not reveal whether an account exists.
- Make `getCurrentUserProfile` tell a database error apart from being logged out.
- Add a DELETE policy for `listing_contacts`.
- Make Satuan editable in produksi, and use the same unit lists everywhere.
- Show "BUMDes/KDMP" in the sidebar for BUMDes users, not "PELAKU USAHA".
