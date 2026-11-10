# Desa Jarak / JARAK CONNECT: Usability, Quality and Security Audit

## Audit setup

| | |
|---|---|
| **Date** | 10 November 2026 |
| **Build tested** | Production build, `next start` on :3100 (built 10 Nov 12:01, commit `a460dbc`) |
| **Backend** | Supabase project `sxhqfrvmdjkpbfoqdnhq`, live |
| **Method** | 8 Haiku subagents, each covering one area (A–H, below); every high and critical item spot-checked by hand against the code or the database |
| **Target user** | Rural Indonesian villager on a cheap Android phone (~360 px wide, Chrome), 3G or weak 4G, limited data, low-to-medium digital literacy, Bahasa Indonesia only, may not have a working email |

| Agent | Area |
|---|---|
| A | Public pages |
| B | Authentication |
| C | Mitra (buyer) journey |
| D | Pelaku Usaha (seller) journey |
| E | Analisis Desa |
| F | Database, row-level security (RLS) and storage |
| G | Performance and slow networks |
| H | Code-level UX and accessibility |

Severity scale:

| Severity | Meaning |
|---|---|
| **Critical** | Breaks the product for the target user, or exposes their data |
| **High** | Major obstacle, wrong data, or a security issue |
| **Medium** | Real friction |
| **Low** | Polish |

---

## 1. What the site is for

Desa Jarak ("JARAK CONNECT") is a marketplace for one village's economy, Desa Jarak. It has three parts.

1. **Direktori Usaha** (public). It lists two things:
   - *Permintaan Mitra*: buyers (companies, institutions) posting what they need, e.g. "5 ton cabai merah per week".
   - *Penawaran Desa*: village sellers posting what they can supply.
2. **Request and offer workflow** (signed in).
   - A **Mitra** (buyer) creates a *permintaan* with a 4-step wizard.
   - A **Pelaku Usaha** or **BUMDes/KDMP** (seller) answers with a *penawaran* (4-step wizard, optional photo).
   - The buyer then sees incoming offers on `/mitra`.
3. **Analisis Desa** (signed in, sellers only). This is simple bookkeeping:
   - record income and expense transactions and harvests;
   - view KPI cards, charts, cost per unit (HPP) and a yearly recap;
   - print a report.

The idea is strong and fits the context. A village has produce, buyers need a reliable supply, and the platform connects them and helps the village keep books.

## 2. How each user actually goes through it

### Public visitor

1. Opens `/` and sees a rice-field photo, "SELAMAT DATANG DI JARAK CONNECT – Menghubungkan Potensi Desa dengan Pasar dan Mitra", and one button, "Jelajahi Direktori Usaha".
   - Nothing on the page says "you can sell here" or "you can buy here".
   - The navbar has no **Daftar** (register) link.
2. On `/direktori`, the visitor can search, filter, and open cards. All of this works.
3. Every action button silently redirects to `/masuk` with no explanation:
   - "+ Buat Penawaran"
   - "Ajukan Penawaran"
   - "Nyatakan Minat", which also never records any interest.

### New villager registering

1. Must find "Daftar sekarang", which is only on the login page.
2. Scrolls past a tall hero; the form starts about 850 px down.
3. Picks a role from three buttons ("Mitra", "Pelaku Usaha", "BUMDes/KDMP"). The explanation of the roles sits *below* the submit button.
4. Fills 6 fields. **An email address is mandatory**, and login is email-only. Phone is collected but cannot be used to sign in or to recover the account.
5. Email confirmation is off, so the account works immediately. A mistyped email can never be recovered.

### Mitra (buyer)

1. Lands on `/mitra`. The default tab is an empty "Penawaran Masuk" table that says "Tidak ada penawaran yang cocok… ubah kata kunci", as if a search failed.
2. At 360 px the header text overlaps and the page scrolls sideways (scrollWidth 418 px).
3. Creates a request: 4 steps, 22 controls, 9 typed or required inputs.
   - Reload or Back loses everything unless "Simpan sebagai Draf" was tapped. That button is 11 px text.
4. After submitting, the request is **published forever**. It cannot be edited, closed, deleted, or marked fulfilled.
5. When offers arrive:
   - A price range shows as a number roughly 100,000× too large (Critical, §4.4).
   - "Hubungi Penawar" only shows a toast.
   - There is **no accept or reject** action.

### Pelaku Usaha / BUMDes (seller)

1. Lands on `/usaha`. "Penawaran Saya" holds real data.
2. **"Permintaan Masuk", "Pesan" and "Dokumen" are hardcoded fake data**: fake companies, fake messages, fake contracts, and fake badge counts "3" and "2".
   - "Ajukan Penawaran" on a fake row opens a *different* real request.
   - "Unduh" and "Buka Pesan" only show a toast.
3. Answers a request from the directory.
   - The location is prefilled as "Dusun Krajan, Desa Jarak", even for a seller from another hamlet.
   - Typing "2,5" ton silently became 25.
   - A normal 3–5 MB phone photo is rejected: "maksimal 2,5 MB… disimpan di peramban".
4. After sending, the offer waits as "Menunggu" forever, because the buyer has no way to respond in the app.
5. **On a phone there is no logout** on `/usaha` or `/usaha/analisis`.

### Analisis Desa

1. A new user sees "Rp 0" everywhere with no guidance on what to do first.
2. Adding transactions works, but data quality is poor:
   - negative values are accepted;
   - "2,5" becomes 25;
   - totals add kg, ton and "unit" together and label the sum "kg";
   - HPP is computed from that mixed sum;
   - the "Target" bars are a copy of the actual bars.
3. Delete is a 16 px icon with no confirmation.
4. On a phone the table opens scrolled to the right, so date and description are hidden.

## 3. Verdict: is it usable for villagers?

**Not yet.** The concept, the Indonesian copy in most places, the validation messages, and the data isolation are a good base. Five things block real rural use today.

1. **Speed.** Every page carries a **2.25 MB logo** displayed at 36 px. `/masuk` and `/daftar` add a 717 KB background. Estimated first load:

   | Page | At 400 kbps | At 1.6 Mbps |
   |---|---|---|
   | Home | ~53 s | ~14 s |
   | Login / register | ~67 s | ~18 s |

   Fixing two image files cuts the home page to about 0.33 MB, roughly 8 s at 400 kbps.
2. **Email-only accounts.** Many villagers use WhatsApp, not email. There is no phone or OTP sign-in and no reset path except email.
3. **Fake and dead UI.** Sample data looks real, buttons only show toasts, and the help WhatsApp is a placeholder number. Villagers will lose trust, or act on fake messages.
4. **The loop never closes.** A buyer cannot accept or reject an offer, cannot contact the seller in one tap, and cannot close a request. Sellers wait forever.
5. **Exposed contact data.** Any registered user can read every phone and WhatsApp number in the directory. Signup is instant and unverified, so harvesting numbers is trivial. This is a scam risk for villagers.

| Area | Score | Notes |
|---|---|---|
| Mobile layout, public pages | 7/10 | No horizontal overflow at 360 px; menu works; search box cramped |
| Mobile layout, dashboards | 3/10 | `/mitra` overflows and the header overlaps; tables 963–1040 px wide; no mobile logout |
| Simplicity | 4/10 | 22-control wizard; jargon (Kemitraan, HPP, KDMP, PIC, Pre-Order, Konsinyasi, Tempo, Ritme…); 8 different "create" button labels |
| Readability | 5/10 | 8–11 px labels in many places; several text colours at 3.5–4.3:1 contrast; inconsistent number formats |
| Speed on slow networks | 2/10 | 2.5–3.3 MB per page, almost all images; client-side request waterfalls; no offline support |
| Data correctness | 4/10 | Unit mixing, comma decimals, negatives, price mangling, UTC dates |
| Security and privacy | 5/10 | RLS is mostly sound, but contact scraping, self-set status, an open redirect, and no signup verification |

---

## 4. Findings by area

Findings marked ✔ were reproduced or confirmed by hand.

### 4.1 Performance and slow networks (Agent G, with A and E)

| Sev | Finding | Where |
|---|---|---|
| **Critical** ✔ | Logo PNG is **2,249,247 bytes** (1840×2244) but is shown at 36–40 px on every page. It is also `preload`ed on `/direktori`, `/masuk` and `/daftar`, so it competes with JavaScript. The analisis pages already use an 11 KB logo. | `public/assets/Logo Desa Jarak.png`; `components/navbar.tsx:105-111`, `app/mitra/page.tsx:286`, `app/usaha/page.tsx:310` |
| **High** ✔ | Login and register background is a **717 KB** PNG, and it is also downloaded on mobile. | `public/assets/login.desa.png`; `app/masuk/login.css:41`, `app/daftar/daftar.css:34` |
| **High** ✔ | Photo upload has no resizing. Files over 2.5 MB are rejected, which covers most normal phone photos. The message wrongly says the photo is "disimpan di peramban". The upload error elsewhere says "maksimal 5 MB". Photos are served at full size on cards and in the modal. | `components/forms/form-wizard.tsx:318-320, 989`; `lib/listings.ts:636-672, 661` |
| **High** | Form state is lost on reload, Back, or a killed tab. There is no autosave and no `beforeunload` warning. The photo is uploaded *before* the row is saved, so retries re-upload it and leave orphan files. Network errors show as a photo-size error or as raw English text ("Failed to fetch"). Supabase calls have no timeout. | `form-wizard.tsx:243-305`; `lib/listings.ts:537-552, 667-797` |
| Medium | `/usaha` and `/mitra` fetch on the client after hydration: `getSession` → `profiles` → `listings`, about 5 sequential round trips, while the server layout has already loaded the profile. There is no `loading.tsx` and the screen stays blank. | `app/usaha/page.tsx:192-240`, `app/mitra/page.tsx:82-130` |
| Medium | Analisis loads the same data twice (`loadCombinedData()` is called by two effects). Data finished about 2.7 s after navigation even on localhost. | `app/usaha/analisis/page.tsx:166-458` |
| Medium | supabase-js (about 71 KB gzipped) ships to the public home page. Total JS and CSS on home is about 255 KB gzipped. | build chunks |
| Medium | `/direktori` loads all listings with no limit or pagination, renders dynamically with `no-store`, and has a 450 ms TTFB on localhost. | `app/direktori/page.tsx:17-45` |
| Medium | `/assets/*` is served with `max-age=0`, so every navigation revalidates every image. That is an extra round trip on 3G. | static assets |
| Medium | There is no manifest, service worker, `theme-color`, or offline page, so the site cannot be added to the home screen and has no offline shell. | `app/`, `public/` |
| Medium | There is no `error.tsx`, `not-found.tsx` or `global-error.tsx`. The 404 page reads, in English, "This page could not be found." | `app/` |
| Low | `/direktori` has no Suspense boundary or skeleton. Recharts (121 KB gzipped) could be lazy-loaded inside the analisis route. Poppins ships 5 weights (39 KB). An unused hero-video and placeholder mp4 remain. Only the root layout sets a page title. | |

**What is already good:**
- lucide icons are tree-shaken.
- Recharts loads only on the analisis route.
- Hashed chunks are cached immutably.
- `/masuk` and `/daftar` are prerendered.
- Fonts are self-hosted, with no Google request.
- `lang="id"` and the viewport meta are set.

### 4.2 Security, data and database (Agent F, with B)

| Sev | Finding | Where |
|---|---|---|
| **High** ✔ | **Any logged-in user can read every published listing's contacts:** PIC names, phone, WhatsApp, email, and `farmerPhones`. Both usaha and mitra accounts read 11 of 11 rows. Auth settings are `mailer_autoconfirm: true` and `disable_signup: false`, so harvesting every number takes one signup request. The consent text in the wizard does not say that contacts become visible. | policy "kontak dapat dibaca pengguna yang login" (initial migration); `form-wizard.tsx:1155-1161` |
| **High** ✔ | **Status is self-asserted.** A usaha inserted an offer with `status:'accepted'` (HTTP 201) and patched it to `completed` (HTTP 200). Neither the insert nor the update policy constrains `status`. (Changing `kind` is correctly blocked, HTTP 403.) | listings insert and update policies |
| **High** ✔ | **Open redirect** in the OAuth callback. The guard rejects only `//`, so `next=/\evil.test` passes and `new URL()` resolves it to `http://evil.test/` (confirmed in Node). The client-side redirect in `masuk/page.tsx:82-100` is safe. | `app/auth/callback/route.ts:58-75` |
| Medium ✔ | An offer can attach to **any `request_id`**: another mitra's draft, or an id that does not exist (both HTTP 201). `request_id` has no foreign key. The mitra then sees offers on a request it never published. | listings insert policy; schema |
| Medium | The role is self-declared at signup, so anyone can register as `bumdes`. RLS treats `usaha` and `bumdes` the same. If the UI implies "BUMDes = official village enterprise", that claim is unverified. | `handle_new_user()` |
| Medium | Storage: no per-user quota; photos are not deleted when a listing is deleted; the uploader's UUID is in the public URL; 4 pre-existing orphan objects. Overwriting and cross-user writes are correctly blocked. | bucket `listing-photos` |
| Medium | If saving the contact fails after the listing is saved, the "coba simpan ulang" retry is blocked by the final-status guard. The listing stays published with no contact, and there is no way to fix it. | `lib/listings.ts:686-693, 770-784` |
| Medium | Email confirmation is off. Typo'd or someone else's email addresses are accepted. The "perlu konfirmasi" code path is dead. | Supabase auth; `app/daftar/page.tsx:181-197` |
| Low | `listing_contacts` has no DELETE policy. Default grants (TRUNCATE, TRIGGER, REFERENCES) are wider than needed. `updated_at` has no trigger. Leaked-password protection is off (the only security advisor warning). | |
| Low | Duplicate-email message reveals whether an account exists. Login trims the password (`masuk/page.tsx:109`) but register and reset do not, so a password with a leading or trailing space cannot log in. Minimum password length is 6 at login and 8 at register and reset. | |
| Low | The analisis PDF report writes user descriptions into `document.write` unescaped (self-XSS in the user's own print window). | `app/usaha/analisis/page.tsx:508-530` |
| Low | `getCurrentUserProfile` returns `null` on any error, so a transient database error looks like being logged out. | `lib/supabase/server.ts` |

**Data model notes:**
- `listings.data.status` duplicates the `status` column with a different vocabulary. Example: `seed-offer-6` is `published` in the column but "Selesai" in the JSON.
- `data.image` holds relative repository paths.
- The contact JSON shape differs between requests and offers.
- Missing indexes: `listings(format, kind, status)`, `listings(created_at)`, `transactions(user_id, tanggal)`.
- Migrations match the live database exactly.

**What is already good:**
- `transactions` and `productions` are isolated per user. Every cross-user read and write returned 0 rows or 403.
- Profile `role` and listing `kind` cannot be changed.
- Drafts and their contacts are hidden from everyone else.
- Anonymous users see no contacts.
- Helper functions live in a non-exposed `private` schema.
- The bucket enforces a MIME allowlist and a 5 MB cap.

### 4.3 Authentication (Agent B)

| Sev | Finding | Where |
|---|---|---|
| **High** ✔ | **No logout on mobile** on `/usaha` and `/usaha/analisis`. `.sidebar-bottom` (which holds "Keluar dari Akun") is `display:none` at ≤768 px, and the analisis pages have no logout at all. This is a real risk on shared family phones. | `app/usaha/usaha-dashboard.css:513-515`, `app/usaha/page.tsx:406-417`, `components/analisis/sidebar.tsx` |
| **High** ✔ | Open redirect (see §4.2). | `app/auth/callback/route.ts:58-75` |
| Medium | Email is mandatory and login is email-only. The phone number is required but unused. Password reset works only by email; there is no WhatsApp, OTP, or admin-assisted reset. | `/daftar`, `/masuk`, `/reset-password` |
| Medium | Role picker has three bare labels. The explanation is below the submit button, the buttons have no `aria-pressed`, the hero pushes the form about 850 px down, and errors appear at the bottom without moving focus. | `app/daftar/page.tsx:281-315, 368-400` |
| Medium | `/masuk` also asks the user to pick a role, and it must match the account's role, otherwise "Akun ini terdaftar sebagai…" appears. This is an extra decision for users. | `app/masuk/page.tsx` |
| Low | Opening a page for another role bounces silently. For example, a mitra following `next=/usaha/analisis` lands on `/mitra` with no message. | `app/mitra/layout.tsx:15`, `app/usaha/layout.tsx:15` |

**What is already good:**
- Clear Indonesian messages for a wrong password, a wrong role, an empty or invalid field, a duplicate email, and unchecked terms.
- The show-password toggle works.
- `next=` is preserved through login.
- Role layouts block cross-role pages.

### 4.4 Request, offer and dashboard workflow (Agents C, D and H)

| Sev | Finding | Where |
|---|---|---|
| **Critical** ✔ | The mitra dashboard strips every non-digit from the price note. "Rp11.800 - Rp12.300/kg" displays as **"Rp 1.180.012.300 / Kg"**. The placeholder itself invites ranges. The "/ Kg" suffix is hardcoded. | `app/mitra/page.tsx:143-145, 58` |
| **High** ✔ | **Fake data in the seller dashboard.** `SAMPLE_TAB_DATA` contains made-up companies, messages ("Sampel sudah kami terima…"), and documents, with past dates (Apr–May 2026). Sidebar badges are hardcoded to "3" and "2". "Ajukan Penawaran" on the fake "Pasokan Cabai Segar / CV Pangan Nusantara" row opens the real *Tebu / PT Kebun Tebu Mas* request. | `app/usaha/page.tsx:32-157, 61-62, 362, 376` |
| **High** | **Toast-only buttons**: "Unduh", "Buka Pesan" (`usaha/page.tsx:549-563`), "Hubungi Penawar" (`mitra/page.tsx:621-631`; it shows the phone number as text in a toast instead of a `wa.me` or `tel:` link), and "Nyatakan Minat" (`direktori-client.tsx:1371-1387`; it only opens the modal). | |
| **High** | **No accept or reject** for the buyer, and no way to close, edit, or delete a published request. Offers stay "Menunggu Respons" forever. Opening `?entryId=` on a published request shows a *blank* wizard with active buttons, which probably creates a duplicate if submitted (not submitted). | `app/mitra/page.tsx`; `components/forms/form-wizard.tsx:84-86` |
| **High** ✔ | Quantity uses `type="number"`. In Chrome "2,5" became **25** without any error (seen in the offer wizard and in analisis). The validator in `form-flow.ts:470` already handles commas but never sees them. This was tested with an en-US locale; Indonesian-locale Android may differ, but the failure is silent either way. | `form-wizard.tsx:746-754` |
| **High** | The wizard's draft is lost on reload or Back (the only save is the tiny "Simpan sebagai Draf"). Raw `err.message` is shown to users. | `form-wizard.tsx:68-70, 265, 301`; `form-wizard.css:14` |
| Medium | The "Target Mulai Pasok" and "Periode Panen" date fields are free text. "Januari 2020" passes validation, the example "Minggu ke-2 Mei 2026" is already in the past, and the values cannot be sorted. | `form-wizard.tsx:800-815`, `form-flow.ts:463-468` |
| Medium | Directory requests past their deadline still show "Baru" with an active "Ajukan Penawaran". Example: Tebu, due 20 Okt 2026. | `direktori-client.tsx:895-897, 957` |
| Medium | Offer location is prefilled as "Dusun Krajan, Desa Jarak" and position as "Koordinator Pasokan". Sellers may submit these without noticing. | `lib/forms/form-flow.ts:336-342` |
| Medium | The duplicate-offer guard fires only at the final step, after all four steps are filled in. | `lib/listings.ts:695-712` |
| Medium | A failed step does not focus or scroll to the first invalid field. The summary appears under the buttons. | `form-wizard.tsx:194-201, 1224-1226` |
| Medium | The phone field accepts letters, and the error ("Masukkan nomor telepon yang dapat dihubungi") does not say what is wrong. | `form-flow.ts:430-435` |
| Medium | The empty state for "Penawaran Masuk" blames the search ("Tidak ada penawaran yang cocok… ubah kata kunci") when the user simply has no offers yet. | `/mitra` |
| Medium | Fallbacks look like real data: `DEFAULT_TARGET_REQUEST` (a fake "CV Pangan Lestari Kediri" buyer), a default price of "Rp13.000 - Rp15.100", the "Jasa Pertanian" image label on every photo-less offer, and "Kelompok Tani Makmur" as the default user name. | `lib/forms/domain.ts:74-100`, `lib/listings.ts:317, 572-588`, `direktori-client.tsx:1321`, `analisis/page.tsx:40` |
| Medium | The "Jenis" filter puts fresh crops under "Produk Olahan & Kuliner" (substring matching). | `direktori-client.tsx:155-201` |
| Low | Reference codes come from `Date.now()`'s last 4 digits, so they can collide. A stale draft banner appears on every new wizard. "Lihat di Direktori" goes to the directory, not to the item. | `form-flow.ts:529-533` |

**What is already good:**
- Inline field errors are in plain Indonesian.
- "Sebelumnya" keeps entered data.
- Drafts save and resume correctly.
- The review step is clear, with "Ubah Langkah N" links and a consent gate.
- Sensible prefilled defaults.
- The confirmation page shows the reference.
- The photo type check works, and an 8.4 MB image is rejected with a message.
- The duplicate guard exists.

### 4.5 Analisis Desa (Agent E)

| Sev | Finding | Where |
|---|---|---|
| **Critical** ✔ | **Negative quantity and price are saved.** −5 × Rp −1.000 was counted as Rp 5.000 *income*. The only check is `!jumlah`, and there is no `min`. | `app/usaha/analisis/input-harga/page.tsx:55-66, 238-279` |
| **Critical** | "2,5" becomes 25 (see §4.4). | `input-harga/page.tsx:238-245`, `produksi/page.tsx:152-159` |
| **High** ✔ | **Units are mixed.** 20 kg + 2.5 ton + 1 unit shows as "Total Penjualan 23,5 kg". 500 kg + 1.5 ton of production shows as "501,5 kg" (the correct total is 2.000 kg). HPP = cost ÷ that mixed sum. "kg" and "Rp/kg" are hardcoded. | `app/usaha/analisis/page.tsx:218-226, 259-264, 437-443, 691, 697, 731` |
| **High** ✔ | The "Target" chart series uses the same data key as the actual series, so the bars are identical. Users will read it as a goal they set. | `page.tsx:578-579, 606-607, 634-635`; `bar-chart-card.tsx:81-87` |
| **High** | The Pengeluaran chart includes asset purchases while the "Total Biaya" KPI excludes them. Two numbers on one screen disagree. | `page.tsx:375-392` vs `214-216` |
| **High** | Edit mode saves an empty price as Rp 0 silently, with no validation. | `input-harga/page.tsx:95-112, 388-399` |
| **High** | Delete runs immediately, with no confirmation and no undo. The icons are 16 px and 8 px apart. | `input-harga/page.tsx:81-88, 461-477`; `produksi/page.tsx:74-81, 337-353` |
| **High** | At 360 px the transaction table (963 px wide) opens scrolled right, so Tanggal, Tipe and Deskripsi are off-screen. | `input-harga/page.tsx:298` |
| **High** ✔ | "Butuh Bantuan? Hubungi Kami" opens `wa.me/6281234567890`, a placeholder number. | `components/analisis/sidebar.tsx:34, 126-136` |
| **High** | Number formatting is inconsistent and sometimes wrong. The trend axis shows "0 jt" for everything under Rp 500 rb. "Rp 1.0 M" hides Rp 15 jt. The donut shows "Rp 1015.5 jt" (dot decimal). The bar axis shows "1.0M". The tooltip shows "12.000 Rp". | `finance-trend.tsx:40`, `kpi-cards.tsx:18-26`, `revenue-donut.tsx:59-61`, `bar-chart-card.tsx:57, 65-67` |
| Medium | The default period is the current month, and production is filtered by harvest date, so harvests from earlier months "disappear" with no hint. | `page.tsx:37-42, 182-184` |
| Medium | A harvest date earlier than the planting date is accepted. The default date is in UTC, so between 00:00 and 07:00 WIB it is yesterday. | `produksi/page.tsx:49-72`; `input-harga/page.tsx:25-27`, `produksi/page.tsx:26-31` |
| Medium | Labels have no `htmlFor`/`id`, so inputs are unnamed for screen readers. | `input-harga/page.tsx:147-281`, `produksi/page.tsx:135-204` |
| Medium | Two ☰ buttons on mobile do different things. There is no onboarding, and the empty dashboard is all "Rp 0". "Unduh Laporan (PDF)" actually opens a print pop-up and has no totals, profit (laba) or HPP. KPI values are truncated, with the full value only in a `title` tooltip. Satuan cannot be edited in produksi, and the unit lists differ (8, 5 and 7 options). | `top-nav.tsx:14-21, 62-69`; `kpi-cards.tsx:57-64` |
| Low | The sidebar says "PELAKU USAHA" for BUMDes users. Only some form fields are reset after saving. | `sidebar.tsx:66` |

**What is already good:**
- Data saves and reloads.
- Single-month totals are correct when units match.
- The table uses correct id-ID Rupiah formatting ("Rp 25.000").
- The period selector works.
- Charts stay legible at 360 px.

### 4.6 Public pages (Agent A)

| Sev | Finding | Where |
|---|---|---|
| **High** | No "Daftar" in the navbar and no seller call to action on the home page. Registration is reachable only from `/masuk`. | `components/navbar.tsx:133-145`, `app/page.tsx:32-34` |
| **High** | The home page never says what a villager can do. Suggestion: two cards, "Jual hasil desa Anda" and "Cari hasil desa". | `app/page.tsx:24-34` |
| Medium | The login wall is unexplained before tapping. The modal says "Masuk sebagai pelaku usaha desa…" even to buyers, and after login the user returns to the top of the list, not to the item. | `direktori-client.tsx:581-609, 1541-1557, 1713-1729` |
| Medium | Empty states have no "hapus filter" button. At 360 px the search box is about 201 px wide and its placeholder is cut off. The modal has no Escape, focus move, or focus trap. There is no footer, help, or contact page anywhere. | `direktori-client.tsx:889-892, 1003-1012, 1398-1409`; `app/layout.tsx` |
| Low | Accordion chevrons are the letters "^" and "v". Zero-count filter options are clickable. The hamburger does not change when open. Labels are 10–11 px at #888 (3.54:1). Three different verbs are used for the "offer" action. | |

**What is already good:**
- No horizontal overflow at 360 px on `/` and `/direktori`.
- The mobile menu works, with 44 px rows.
- Search, tabs, filters and counts work.
- Prices are visible on cards.
- No dead links.

### 4.7 Mobile layout, readability and accessibility (Agents H, B, C and D)

**High**

- `/mitra` at 360 px: the header text overlaps (logo, BERANDA, DIREKTORI USAHA, account name) and the page scrolls sideways (scrollWidth 418). The topbar has no mobile CSS rule, and the main table has `min-width:1040px`. Source: `app/mitra/mitra-dashboard.css:13-84, 432-436`.
- Tiny text:
  - wizard progress labels at **8 px** on mobile (`form-wizard.css:16`);
  - the wizard eyebrow at 9 px;
  - KPI labels at 10 px;
  - many helper texts at 10–11 px;
  - input text at 13 px (below the 16 px comfortable minimum).
- Low contrast:
  - card labels #888 at 10 px: 3.54:1 (`direktori-usaha.css:355-383`);
  - several muted greys at 4.0–4.3:1;
  - input borders at about 1.3:1 (WCAG 1.4.11 needs 3:1);
  - the focus ring at 1.7:1.

**Medium**

- Tap targets of 27–39 px across the dashboards, filter options, "Lupa kata sandi?" (about 16 px), password toggles (about 24 px), and the mitra account button (about 20 px).
- Errors on login and register have no `aria-live` or `aria-invalid`.
- Radio groups have no `<legend>`.
- The mobile analisis sidebar stays tabbable while hidden.
- Required fields are not marked.

**Low**

- Emoji icons are not `aria-hidden`.
- An English `aria-label` "Toggle Menu".
- Heading-level skips.
- `/reset-password` has no `h1`.
- Tabs have no arrow-key support.

### 4.8 Language and jargon (Agent H)

The main copy is natural Indonesian. Many terms will still confuse villagers.

| Current | Suggested |
|---|---|
| Dashboard (7 places) | Halaman Saya |
| Ajukan Kebutuhan Kemitraan | Tulis Kebutuhan Anda |
| Pre-Order (PO) | Pesan dulu |
| Filter / Reset filter | Saring / Hapus saringan |
| PIC | Penanggung jawab |
| HPP | Modal per kg |
| KDMP (never expanded) | Koperasi Desa Merah Putih (KDMP) |
| Ekspor Data (CSV) | Simpan ke Excel |
| Unduh Laporan (PDF), which actually prints | Cetak laporan |
| Dipublikasikan | Tampil di Direktori |
| bersifat final | tidak bisa diubah lagi |
| peramban | (remove) |
| Konsinyasi Terbatas | Titip jual |
| Tempo 7–14 hari terverifikasi | Bayar 7–14 hari setelah barang diterima |
| Ritme Ketersediaan Pasokan, Uraian, Varietas, Kesesuaian, Pemenuhan, Rekapitulasi, Tren, Ekosistem, Penjajakan, Fasilitasi | Plain everyday words |

Terms are also inconsistent across pages:
- **Buyer:** Mitra, Pemohon, Mitra Pembeli, Pemohon Kemitraan.
- **Seller:** Pelaku Usaha, Penyedia, Penawar, Pemasok.
- **"Create request":** 8 different button labels.
- **Waiting status:** "Menunggu Respons", "Menunggu Respon", "Menunggu".
- **Completed status:** "Terlaksana" vs "Selesai".

Recommendation: settle on **Pembeli** for the buyer and **Penjual** (or Pelaku Usaha) for the seller, and use them everywhere.

---

## 5. Prioritized fix list

### Quick wins (hours each, large impact)

1. **Shrink the logo** to a WebP or PNG of about 10 KB at 2× display size, and drop the preload. Compress `login.desa.png` to under 60 KB. *This alone takes the home page from about 53 s to about 8 s on 400 kbps.*
2. **Remove `SAMPLE_TAB_DATA` and the hardcoded badges** from `/usaha`. Hide or disable "Unduh", "Buka Pesan" and "Nyatakan Minat" until they work.
3. **Make "Hubungi Penawar" a `https://wa.me/62…` link**, and make contact numbers tappable everywhere.
4. **Replace the placeholder WhatsApp number** in `components/analisis/sidebar.tsx:34`.
5. **Fix the price display** in `app/mitra/page.tsx:143-145`: show the raw `priceNote`.
6. **Add a mobile logout** to the `/usaha` topbar and the analisis top nav.
7. **Fix the open redirect**: reject `\` in `next`, or require `new URL(next, origin).origin === origin`.
8. **Numeric inputs**: switch to `type="text" inputMode="decimal"`, normalise commas, and reject values ≤ 0, in both the wizard and analisis.
9. **Remove the "Target" chart series** and fix the "0 jt" axis. Use one Rupiah formatter.
10. **Confirm before delete** in analisis, and use 44 px icon buttons.
11. **Add "Daftar" to the navbar** and a seller and buyer explainer block on the home page.
12. **Make the 8–11 px text at least 12 px** (13–14 px for labels) and darken #888 to about #5a6b5f.
13. **Use the local date** instead of `toISOString()` for date defaults.
14. Add Indonesian `not-found.tsx` and `error.tsx` pages.

### Medium effort (days)

1. **Constrain listing `status`** with a trigger or RPC: insert only `draft` or `published`/`sent`, and allow only the request owner to set `accepted` or `rejected`. Add a foreign key on `request_id` and require the target to be a published request.
2. **Protect contact data**:
   - show contacts only after an offer is accepted, or reveal them on request with a rate limit;
   - add Turnstile and rate limiting to signup;
   - state in the consent text that contacts will be visible.
3. **Close the loop**:
   - buyer *Terima / Tolak* on offers, with the status shown to the seller;
   - *Tutup permintaan* and *edit* for published requests;
   - automatically mark requests past their deadline.
4. **Wizard resilience**: autosave to `localStorage`, add a `beforeunload` warning, map errors to Indonesian ("Koneksi terputus, data Anda masih tersimpan di HP ini"), and upload the photo after the row is saved.
5. **Resize photos on the client** to a 1024 px edge at JPEG quality 0.8 (about 200 KB), and drop the 2.5 MB rejection. Use Supabase image transforms for thumbnails.
6. **Analisis units**: normalise to kg (or group totals by satuan), compute HPP per commodity, and stop hardcoding "kg". Use the same asset rule for the KPI and the chart.
7. **Mobile tables become cards** on `/mitra`, `/usaha` and the analisis tables. Collapse the `/mitra` header into the hamburger menu.
8. **Simplify the wizard** to 3 steps:
   - prefill name and phone from the profile;
   - use pick-lists and a date picker instead of free text;
   - do not prefill location;
   - focus the first invalid field on error.
9. **Server-render the dashboards** using the profile the layout has already loaded, add `loading.tsx` skeletons, and stop analisis loading data twice.
10. **Paginate `/direktori`** with 20 items and "Muat lagi".

### Larger and strategic work

1. **Phone or WhatsApp OTP sign-in and recovery** (Supabase phone auth), or at least an admin-assisted reset through the village office. This is the biggest barrier to inclusion.
2. **Decide what the BUMDes role means.** If it implies an official village enterprise, verify it through an admin step.
3. **PWA**: a manifest (`lang: id`, `theme_color`, icons), a service worker for the app shell and the directory, and offline drafts.
4. **Plain-language pass** with real villagers (the jargon table in §4.8), plus a short "Cara Kerja" help page and a footer with a village-office contact.
5. **Normalise `listings.data`** into columns (product, quantity, unit, price min/max, deadline, location), drop the duplicated `data.status`, and add the missing indexes.

---

## 6. What was not covered

- **Real 3G throttling.** The browser pane cannot throttle the network, so speed figures are byte sizes plus an RTT model (0.6 s setup + 3×300 ms + TTFB + bytes/bandwidth). Real slow-start and CPU parse time on a cheap phone will be worse.
- **A real Android device with an Indonesian keyboard and locale.** The comma-decimal finding was tested in desktop Chrome with an en-US locale.
- **Google OAuth round trip.** The open redirect was confirmed by code and URL resolution only.
- **Real password-reset emails.** Not sent.
- **Signup rate limits.** Not measured.
- **Screen readers.** No real screen-reader pass; accessibility findings are from code and the DOM.
- **"Unduh Laporan (PDF)".** Not clicked (it opens a print pop-up).
- **Viewport width.** Emulation sometimes reported 375 px instead of 360 px. Results were consistent.
- **Shared cookies.** Browser cookies are shared across tabs, so two agents' sessions collided once. Agent E then used `127.0.0.1:3100` to keep a separate cookie jar. No finding depends on the collision.

---

## 7. Appendix: test data created (for cleanup)

Every free-text value starts with "AUDIT TEST". Passwords are kept only in the session scratchpad, not here.

**Auth users and profiles**

| Email | Role | ID |
|---|---|---|
| `audit-test-mitra@desajarak.test` | mitra | `0edc1ad5-c5df-4363-bb69-db26aff770c9` |
| `audit-test-usaha@desajarak.test` | usaha | `67143867-f3c4-4bfe-bb61-a09399b2ec9e` |
| `audit-test-bumdes@desajarak.test` | bumdes | `1bedafce-019f-4691-885d-fd0fb6cb9bee` |
| `audit-test-b-reg@desajarak.test` | usaha | `fdb695d2-499b-4230-9254-27e32bdd92ae` |

**`listings`**

| ID | What it is |
|---|---|
| `request-mwa8n0aq` | Published mitra request, PRM-JRK-7026, "AUDIT TEST Cabai Merah". **Visible in the public directory.** |
| `offer-mwa8wjm7` | Usaha offer, PNW-JRK-1967, status `sent`, answering the request above |
| `905c30b5-0fb2-4fe1-9f81-e903ab809351` | Mitra draft request ("Beras & Gabah") |
| `e604c573-d5ff-40ad-a5d1-fabf3275f652` | Usaha offer on the draft above, self-set to `completed` (RLS test) |
| `aac24947-7acc-40c2-b4af-8f9f7be1ebbb` | Usaha offer pointing at a non-existent request_id |

**`listing_contacts`**
- Rows for `request-mwa8n0aq`, `offer-mwa8wjm7` and `905c30b5-…`.

**`transactions`**
- id 1 (mitra).
- 5 rows on the bumdes account, including a **Rp 1.000.000.000** row that distorts that account's dashboard.

**`productions`**
- 2 rows on the bumdes account ("AUDIT TEST Padi").

**Storage, bucket `listing-photos`**
- `0edc1ad5-…/AUDIT_TEST_mitra.png`
- `67143867-…/AUDIT_TEST_usaha.png`
- `67143867-…/offer-mwa8wjm7.jpg`

**Cleanup status (done 10 Nov 2026, after the audit)**

- **Done.** The four auth users were deleted, and their profiles, listings, contacts, transactions and productions cascaded with them.
- **Verified.** A recount found 0 rows matching "AUDIT TEST" and 0 audit users. The 11 seed listings are untouched.
- **Not done: the three storage objects above are still in the bucket.**
  - Deleting through the Storage API as the owner returned HTTP 400. The bucket has a DELETE policy but no SELECT policy on `storage.objects`, and Supabase's delete needs both.
  - Supabase blocks deleting them directly with SQL (`storage.protect_delete`).
  - They have to be removed in the Supabase dashboard under Storage → `listing-photos`.
  - The 4 pre-existing orphan objects noted in §4.2 are also still there.

**Related finding (Medium).** The "hapus foto sendiri" storage policy does nothing in practice: without a SELECT policy, owners cannot delete their own photos. The app also never calls `storage.remove()` (see `lib/listings.ts`), so every replaced or deleted photo stays in the public bucket permanently. To fix it, add an owner SELECT policy on `storage.objects` for `listing-photos`, and delete the old object when a photo is replaced or its listing is deleted.
