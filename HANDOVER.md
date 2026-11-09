# Handover: rewrite Desa Jarak as one Next.js app on Vercel

Status as of 9 Nov 2026: the current site (branch `fix/preview-siap-deploy`) passed preview. It works, but it is built from four different parts, and that makes it hard to maintain. This document covers how to rebuild it as one Next.js app with the same design, deployed on Vercel, and what has to keep working.

**Short version:** the backend (Supabase) stays exactly as it is. Only the frontend gets rewritten. No data migration is needed.

---

## 1. Why rewrite

The current site is made of four separate pieces:

| Piece | Where | Problem |
|---|---|---|
| Static HTML pages + plain JS | `index.html`, `pages/`, `sub-login-mitra/`, `dashboard-pelaku-usaha/`, `js/`, `css/` | Navbar, footer and Supabase setup are copy-pasted into every page. Large hand-written DOM code (`js/direktori-usaha.js` is 1,300 lines; `css/direktori-usaha.css` is 2,900). |
| Prebuilt React bundle for the request/offer forms | `assets/form-kemitraan/` (source in `src/`, built with esbuild) | A second build step. It talks to Supabase only through a glue layer (`js/forms-adapter.js` → `window.JarakFormsAdapter`). |
| Next.js dashboard "Analisis Desa" | `AnalisisDesa/` | A separate Next.js project, exported statically and served under `/analisis` with its own auth gate. |
| Express server | `server.js` | Only serves static files. Vercel doesn't need it. |

Login state is shared between these pieces through `window.JarakAuth`, `window.supabaseClient`, a sessionStorage key, and the order of `<script>` tags. Pages are hidden until a client-side role check runs (`<body data-require-role>`). All of that goes away in a single Next.js app.

---

## 2. What stays the same

### Supabase project (no changes needed)

- Project `desa-jarak`, region Singapore
- URL `https://sxhqfrvmdjkpbfoqdnhq.supabase.co`
- Publishable key `sb_publishable_eKeRSxcB3_ExEjOX3Lpihw_k186hs7W`. It is safe in frontend code; put it in env vars anyway.
- Schema: `supabase/migrations/` (4 files, already applied). Copy the `supabase/` folder into the new repo as-is.
- Directory sample data: `supabase/seed.sql` (already loaded).
- All access rules are Row Level Security in the database. The new frontend can't weaken them, so a bug in the UI can't leak data that RLS blocks.

| Table | Contents | Who can read / write |
|---|---|---|
| `profiles` | full_name, business_name, phone, role (`mitra` / `usaha` / `bumdes`) | Owner reads. Owner updates name, business name and phone only. Role can't be changed. |
| `listings` | Requests (`kind='request'`) and offers (`kind='offer'`). Content is in the `data` jsonb column. | Anyone reads `published`. Owners read their own. A mitra reads offers sent to their request. Only a mitra can insert requests; only usaha/bumdes can insert offers. |
| `listing_contacts` | Contact details for a listing, in a separate table so logged-out visitors can't see them | Logged-in users, for listings they can see |
| `transactions`, `productions` | Analisis Desa data | Owner only |
| Storage `listing-photos` | Offer photos at `<user id>/<listing id>.<ext>`. Public, max 5 MB, jpeg/png/webp. | Users upload into their own folder |

When someone signs up, the trigger `handle_new_user` creates their `profiles` row from the sign-up metadata `{ full_name, business_name, phone, role }`. It rejects the sign-up if `role` is missing or invalid. The new sign-up page **must** send these fields in `options.data`.

### Design

Keep the look identical. The fastest safe route is to port the existing CSS files close to as-is (as global CSS or CSS Modules per page) rather than redoing everything in Tailwind. Restyling can come later, as a separate task. Images and video are in `assets/` (move them to `public/`). Font: Poppins (use `next/font/google`).

---

## 3. Target stack

- **Next.js 16** (App Router, TypeScript). AnalisisDesa already uses it, so its components move straight over.
- **`@supabase/ssr`** for cookie-based sessions, so the server knows who is logged in. Add a `proxy.ts` (the Next 16 name for `middleware.ts`) that refreshes the session and redirects for protected routes. Server-side redirects replace the hide-body-then-check trick.
- **Supabase JS v2** in client components where interactivity needs it, such as the multi-step form and uploads.
- **Tailwind v4 + Recharts + lucide-react**: keep these for the Analisis pages, which already use them.
- **Vercel** with no custom server. Use static or dynamic rendering as each page needs; no `output: 'export'`.

### Suggested folder layout

```
app/
  layout.tsx                 navbar + footer once, Poppins font
  page.tsx                   beranda (index.html)
  direktori/page.tsx         direktori usaha (requests + offers tabs)
  masuk/page.tsx             login (email + Google)
  daftar/page.tsx            sign up
  reset-password/page.tsx
  auth/callback/route.ts     OAuth + email link code exchange
  mitra/
    layout.tsx               server check: role = mitra
    page.tsx                 incoming offers (sub-login-mitra)
    permintaan/baru/page.tsx request form (form-permintaan + dashboard-sub-fitur-mitra)
  usaha/
    layout.tsx               server check: role in (usaha, bumdes)
    page.tsx                 dashboard pelaku usaha
    penawaran/baru/page.tsx  offer form (?requestId=...)
    analisis/...             the three AnalisisDesa pages
components/                  shared UI, form wizard steps, cards
lib/supabase/{client,server}.ts
lib/listings.ts              read/write helpers + types for listings.data
proxy.ts
supabase/                    copied from the old repo
public/                      images, video, logo
```

Indonesian route names are only a suggestion. Whatever the team picks, add redirects in `next.config` from the old URLs (`/pages/login.html`, `/pages/direktori-usaha.html`, `/analisis/...`) so shared links keep working.

---

## 4. Page-by-page map

| Old URL | Old files | New route | Access | Data | Notes |
|---|---|---|---|---|---|
| `/` | `index.html`, `css/style.css` | `/` | public | none | Hero video `assets/Images/Video/desavidio.mp4` |
| `/pages/direktori-usaha.html` | `js/direktori-usaha.js`, `js/form-direktori.js`, `css/direktori-usaha.css` | `/direktori` | public; contacts only when logged in | `listings` published + `listing_contacts` | Has filters/counts for both tabs and cards for both formats (see §5). The "Ajukan penawaran" button links to the offer form with `requestId`. |
| `/pages/login.html` | `js/login.js`, `css/login.css` | `/masuk` | public | `auth`, `profiles` | See §6 for behavior that must be kept |
| `/pages/daftar-akun.html` | inline script | `/daftar` | public | `auth.signUp` | Sends metadata; handles "already registered" (`identities.length === 0`) and both confirm-on/confirm-off cases |
| `/pages/reset-password.html` | inline script | `/reset-password` | via email link | `auth.updateUser` | |
| `/sub-login-mitra/sub-login-mitra.html` | `sub-login-mitra.js` | `/mitra` | mitra | my requests + offers whose `request_id` is one of them, + contacts | Status labels: sent→Menunggu Respons, accepted→Dalam Proses, completed→Terlaksana, rejected→Ditolak |
| `/pages/dashboard-sub-fitur-mitra.html` | `js/dashboard-sub-fitur-mitra.js` | `/mitra/permintaan/baru` | mitra | insert `listings` (request, published, format form) + `listing_contacts` | Two request forms exist today (this one and `form-permintaan.html`). Merge them into one. |
| `/pages/form-permintaan.html` | form-kemitraan bundle | same as above | mitra | | |
| `/pages/form-penawaran.html?requestId=` | form-kemitraan bundle + `js/forms-adapter.js` | `/usaha/penawaran/baru?requestId=` | usaha, bumdes | insert/update offer, photo upload | Shows "Untuk: <request> · <partner>" from the target request |
| `/dashboard-pelaku-usaha/...` | `dashboard-pelaku-usaha.js` | `/usaha` | usaha, bumdes | "Penawaran Saya" tab = my offers | The other tabs (Permintaan Masuk, Pesan, Dokumen) are still **hard-coded sample data** |
| `/analisis/`, `/analisis/input-harga`, `/analisis/produksi` | `AnalisisDesa/app/*` | `/usaha/analisis/...` | usaha, bumdes | `transactions`, `productions` | Port `lib/api.ts` as-is; replace `components/auth-gate.tsx` with the `usaha/layout.tsx` server check |

**Do not port:** `permintaan-mitra.html`, `js/permintaan-mitra.js`, `css/permintaan-mitra.css`, `pages/detail-pelaku-usaha.html`. Nothing links to them, and they link to pages that don't exist (`profil.html`, `berita.html`, …). Also drop `server.js`, `js/main.js`, `js/supabase-client.js`, `js/forms-adapter.js`, the esbuild setup in `assets/form-kemitraan/`, the sessionStorage key `jarakConnectDemoUser`, and `AnalisisDesa/start-dashboard.bat`.

**Do port the logic in** `assets/form-kemitraan/src/` (`forms.tsx`, `domain.mjs`, `form-flow.mjs`). It is already React and holds the 7-step wizard and its validation. Move it in as normal components and call Supabase directly instead of going through the adapter.

---

## 5. Data shapes to know about

`listings.format` has two values, and their `data` jsonb looks different:

- **`directory`** holds the 11 seed rows (`seed-request-1..5`, `seed-offer-1..6`) with `owner_id = null`. They were copied from the old hard-coded arrays.
  - Requests: `{ partner:{name,type,address}, request:{product,quantity,unit,requiredDate,deliveryLocation,quality,variety,packaging,note,...}, status, fulfilledQuantity, image }`.
  - Offers: `{ product, business, category, quantity, unit, priceLabel, availability, providerType, coverage, status, image, farmers:[...] }`.
  - Contacts for requests: `{ partner:{pic,position,email,phone,whatsapp} }`. Contacts for offers: `{ pic, phone, farmerPhones:[] }`.
- **`form`** holds everything users create, in the form-kemitraan shape (`assets/form-kemitraan/src/storage.ts`, type `FormData`). Contact fields `contactName, position, phone, email` go to `listing_contacts`, not `data`.

The current directory page renders both shapes. In the rewrite, give `lib/listings.ts` one TypeScript type and two mapping functions, so pages only ever see one shape. Optionally, later, add a migration that rewrites the seed rows into the `form` shape, and drop `format`. That is a database change, so do it as its own step.

Reference numbers for new requests look like `DJ-PM-xxxx`.

---

## 6. Behavior that must keep working

These were tested on the preview. Re-test each one on the new app (see §9).

**Login**
1. The user picks an account type (Mitra / Pelaku Usaha / BUMDes). After sign-in, if the profile role doesn't match, sign the user out and show "Akun ini terdaftar sebagai X…".
2. Respect `?next=` after login, same-origin paths only, and keep its query string (e.g. `requestId`).
3. **Google login:**
   - Save the chosen role before redirecting to Google, and check it after the user comes back.
   - If the Google account has no profile yet, show the "not registered" banner (`googleNotRegisteredBanner` in `pages/login.html`).
   - In Next, do the code exchange in `app/auth/callback/route.ts`.
4. "Lupa kata sandi" calls `resetPasswordForEmail` with `redirectTo` pointing at the reset page.
5. Login error messages are mapped to Indonesian in `pesanErrorLogin` (`js/login.js`): wrong credentials, email not confirmed, network.

**Access**

6. Logged out on a protected page → send to login with `next`. Logged in with the wrong role → send to that role's own dashboard.

**Offers**

7. An offer can only be edited while it is a `draft`. A usaha can't send a second offer to the same request.
8. The offer photo goes to `listing-photos/<uid>/<listingId>.<ext>`, and `photo_path` is saved on the listing.

**Directory**

9. Logged-out visitors see listings but no contacts.

**Database guarantees** (RLS already enforces these; the UI should simply not offer them)

10. A mitra can't create an offer, and a usaha can't create a request. Supabase returns error `42501`.

---

## 7. Deploying on Vercel

1. Create the new repo, or a new branch with the app at the root, and import it in Vercel. The framework is detected as Next.js; no build settings needed.
2. Add these environment variables to Production and Preview:
   - `NEXT_PUBLIC_SUPABASE_URL=https://sxhqfrvmdjkpbfoqdnhq.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_eKeRSxcB3_ExEjOX3Lpihw_k186hs7W`
3. In the Supabase dashboard → Authentication → URL Configuration:
   - Set **Site URL** to the Vercel production URL.
   - Add `https://<project>.vercel.app/**` and `https://*-<team>.vercel.app/**` (for preview deployments) to **Redirect URLs**. Sign-up, reset-password and Google links only work for URLs on this list.
4. Google OAuth: nothing changes in Google Cloud Console. Its callback is Supabase's (`https://sxhqfrvmdjkpbfoqdnhq.supabase.co/auth/v1/callback`), not the site's.

No secrets (service role key, etc.) are needed. Everything runs with the publishable key plus RLS.

---

## 8. Supabase settings to remember (dashboard only)

- **Confirm email is OFF for the preview.** Anyone can register with any address. Before a real launch, turn it back on **and** set up custom SMTP (Authentication → SMTP Settings, e.g. Resend or Brevo). Supabase's built-in mailer only delivers to project team members and is rate-limited, which also affects password-reset emails right now.
- **Google provider** must be enabled under Authentication → Sign In / Providers (client ID and secret from Google Cloud Console). The "Masuk dengan Google" button depends on it.

---

## 9. Suggested order of work

Each step ends with something deployable on a Vercel preview.

1. **Skeleton.** New Next app, `lib/supabase`, `proxy.ts`, root layout with navbar/footer and CSS ported, beranda page. *Done when:* `/` looks identical to the old home page on a Vercel preview.
2. **Auth.** Login (email + Google), sign-up, reset, callback route, role layouts for `/mitra` and `/usaha`. *Done when:* the checks in §6 items 1–6 pass.
3. **Direktori.** Read-only listing and filters for both tabs, plus contacts when logged in. *Done when:* the same 5 requests and 6 offers show with the same counts as on the old site.
4. **Forms.** Port the form-kemitraan wizard and merge the two request forms. Offer form with `requestId`, drafts, photo upload. *Done when:* §6 items 7, 8 and 10 pass.
5. **Dashboards.** Mitra incoming offers; pelaku usaha "Penawaran Saya".
6. **Analisis.** Move the three AnalisisDesa pages and `lib/api.ts` under `/usaha/analisis`.
7. **Redirects** from old URLs, then switch the production domain and Supabase Site URL over.

Use an empty test account per role and delete it afterwards (Authentication → Users). Don't leave test listings in the database: the directory shows every published row.

---

## 10. Not built yet / open questions for the team

- **Not built:**
  - The mitra can't accept or reject an offer yet. The statuses `accepted`, `rejected` and `completed` exist in the database, but there is no UI for them.
  - Messages (Pesan), Documents (Dokumen), Profile and Settings pages.
  - Pelaku usaha tabs other than "Penawaran Saya" are sample data.
- **Possibly backwards (check with the team):** in the old directory code, offer contacts are shown only to usaha/bumdes users (`canViewContact` in `js/direktori-usaha.js`). It seems likely that mitra should be the ones seeing offer contacts. The database allows any logged-in user, so this is a UI decision.
- `AnalisisDesa/pnpm-lock.yaml` is stale. The new app should use a single package manager and lockfile.
