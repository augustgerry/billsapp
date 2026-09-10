# Kongsi — Arsitektur & Status Port

Dokumen ini nyatet keputusan porting dari prototipe (`kongsi-pilot.html`) ke
React Native (Expo SDK 57) + Supabase. Dibaca bareng `PROJECT_BRIEF.md`.

## Status

| Bagian | Lokasi | Catatan |
|---|---|---|
| Tipe domain | `src/types/models.ts` | 1:1 dengan data model di brief |
| Logika billing/cicilan/status | `src/domain/{billing,money,dates}.ts` | port murni, dependency-free |
| Unit test | `src/**/*.test.ts` | 51 test, `npm test` (pakai `tsx`) |
| Skema DB + RLS | `supabase/migrations/*.sql` | **applied** ke `wyhihlddtnbyqvjutjyf` (8 tabel, RLS on, RPC, bucket `proofs`, trigger edit-nominal, realtime publication) |
| Edge Function OCR | `supabase/functions/read-proof/` | **deployed** (v2). Balikin amount + isReceipt + platform + suspiciousNote. ⚠️ akun Anthropic $0 credit — OCR error sampai di-top-up |
| Edge Function notify | `supabase/functions/notify-proof/` | **deployed**. Push ke PJ abis upload bukti (service role) |
| Supabase client | `src/lib/supabase.ts` | typed `createClient<Database>` (generated `database.types.ts`), session di `expo-secure-store` (chunked) |
| Auth context | `src/features/auth/auth-context.tsx` | register → OTP → login, + registrasi push token, di-wire di root `_layout` |
| Repository layer | `src/lib/*-repository.ts`, `mappers.ts`, `proofs.ts` | row ↔ domain, typed, semua lewat RLS |
| Push notifications | `src/features/notifications/*` | token registration + notify-proof caller — butuh dev build (lihat docs/PUSH_SETUP.md) |
| Realtime | `src/features/groups/use-group-realtime.ts` | dashboard auto-refresh pas anggota lain update |
| Tema | `src/features/settings/theme-preference.tsx` | Terang/Gelap/Ikuti Sistem, persist SecureStore. Accent = **gold** (`#D6AE52` / `#9C7A1E`), `primaryOn` buat teks di tombol gold |
| Bahasa | `src/features/settings/{locale,strings}.tsx` | id/en toggle di Settings, persist SecureStore. Domain display strings terima arg `locale` |
| Undangan anggota | `group_members.status` + RPC `list_my_invites`/`respond_to_invite` | pending → active; section "Undangan" di Home |
| Routing auth-gated | `src/app/_layout.tsx` + `(auth)/` `(app)/` | Stack + guard + Supabase config gate |
| Layar auth | `src/app/(auth)/{login,register,verify}.tsx` | fungsional, Enter submit, tombol disable |
| Layar Home / Buat / Join / Login grup | `src/app/(app)/*` | fungsional (recent list, create RPC, join lookup, PIN) |
| Tambah tagihan | `src/app/(app)/group/[id]/add-bill.tsx` | fungsional — kategori, tanggal manual, single/split, blok Cicilan |
| Dashboard tab Tagihan | `src/app/(app)/group/[id]/index.tsx` + `features/bills/bill-card.tsx` | fungsional — hero kontribusi, card per bill, expand rincian, Edit nominal |
| Upload bukti + alur status | `features/bills/{proof-actions,pick-proof-image}.ts` | fungsional — upload→OCR→status, self-declare/confirm/reject/reupload, lunasi dipercepat single, lihat bukti |
| Dashboard tab Ringkasan | `features/summary/*` | fungsional — "siapa belum bayar", chart tren (Views), export CSV + PDF, generator reminder + salin |
| Pengaturan | `src/app/(app)/settings.tsx` | info akun, toggle tema, keluar |

Produksi bundle (`expo export --platform ios`) sukses; `npm run typecheck` bersih; 51 test lulus.

## Struktur folder

```
src/
  app/                       # expo-router (file-based)
    _layout.tsx              # providers + Supabase gate + Stack
    index.tsx                # redirect: session -> (app), else (auth)/login
    (auth)/{login,register,verify}.tsx
    (app)/
      index.tsx              # Home (recent groups, buat / join)
      create-group.tsx  join-group.tsx  group-login.tsx (PIN)
      group/[id]/{index,add-bill}.tsx    # dashboard skeleton
  domain/                    # aturan bisnis murni — TIDAK impor React/RN
    billing.ts  money.ts  dates.ts  *.test.ts
  types/models.ts
  lib/
    env.ts  supabase.ts  database.types.ts  mappers.ts
    groups-repository.ts  bills-repository.ts  payments-repository.ts
    recent-groups-repository.ts  proofs.ts
  features/
    auth/auth-context.tsx
    groups/unlocked-groups.ts    # in-memory "PIN sudah dimasukkan" set
  components/ui/               # Screen, Button, TextField, TextLink, LoadingScreen
  constants/theme.ts           # palet dark-first (dari prototipe) + kategori
supabase/
  migrations/20260909000000_init.sql   functions/read-proof/index.ts   config.toml
docs/
```

## Domain layer — mapping dari prototipe

| Prototipe (`kongsi-pilot.html`) | Port (`src/domain/`) |
|---|---|
| `isInstallmentDone(bill)` | `isInstallmentDone` |
| `requiredMembers(bill)` | `requiredMembers` |
| `maybeAdvanceInstallment(bill, rec)` | `maybeAdvanceInstallment` (+ guard, lihat bawah) |
| `getMonthRecord` (mutating) | `readMonthRecord` (murni, tidak bikin record) |
| upload handler match/mismatch | `applyProofUpload` |
| tombol "Tandai valid" / "Tandai sudah bayar" | `applySelfDeclare` |
| `[data-confirmpay]` | `applyConfirm` |
| `[data-rejectpay]` | `applyReject` |
| "Upload ulang" (baru) | `applyReupload` + `canReupload` |
| `[data-payoff]` (lunasi dipercepat) | `applyEarlyPayoff` + `earlyPayoffInfo` |
| "Edit nominal" | `applyEditNominal` + `canEditNominal` |
| loop agregasi di `renderGroup` | `monthlyOverview` |
| badge status bill | `billBadge` |
| `metaText` | `billMetaText` |
| `btnReminder` | `buildReminderText` |
| `computeMonthlyCategoryTotals`, `buildExportRows` | sama |

Semua fungsi `apply*` **murni**: nge-clone input, balikin state baru
(`{ bill, record }`). Yang manggil yang nyimpen ke Supabase.

### 3 perubahan sengaja dari prototipe

1. **Guard idempotensi cicilan** (`MonthRecord.installmentAdvanced`).
   Di prototipe, `maybeAdvanceInstallment` bisa naikin `paidCount` lebih dari
   sekali per bulan kalau ada event `paid` berulang (mis. member re-upload
   bukti). Sekarang: begitu bulan itu udah naik counter, `installmentAdvanced`
   di-set dan nggak akan naik lagi bulan itu. → **open question #1**.

2. **`MemberPayment.ocrMatched` beneran disimpan.** Prototipe nyebut field ini
   di `renderMemberRow` tapi nggak pernah nge-set. Sekarang diisi tiap upload,
   biar PJ ada konteks pas mau konfirmasi pembayaran `awaiting`. → **open
   question #4**.

3. **Jalur "Upload ulang" dari `review`** (`applyReupload` + `canReupload`).
   Di prototipe, pembayaran `review` cuma bisa maju (self-declare) — nggak ada
   cara balik buat foto ulang. Sekarang pengupload bisa reset ke `unpaid` +
   hapus bukti lama biar coba foto yang lebih jelas. Beda sama "Tandai sudah
   bayar" (`applySelfDeclare`) yang tetap lanjut ke `awaiting`. → **open
   question #3**.

## Pertanyaan terbuka — status

Poin 1, 2, 4, 6 dikonfirmasi user (2026-09-09). Poin 3 & 5 dikoreksi.

| # | Isu | Keputusan |
|---|---|---|
| 1 | `paidCount` nggak pernah turun kalau pembayaran `awaiting` ditolak setelah cicilan sempat "lunas" bulan itu | ✅ Ikut prototipe: **tidak** decrement. Guard cuma nyegah double-*increment*. |
| 2 | PJ nggak bisa dorong pembayaran split dari `review` (cuma pengupload) | ✅ Ikut prototipe: hanya pengupload. `canSelfDeclare` mencerminkan ini. |
| 3 | `review` nggak punya jalur "Tolak" | ✏️ **Dibenerin.** Tambah "Upload ulang" (`applyReupload`): reset ke `unpaid` + hapus bukti lama, buat foto ulang. Beda dari "Tandai sudah bayar" (→ `awaiting`). |
| 4 | Simpan hasil OCR + flag match | ✅ **Ya**, disimpan (`amount`, `ocrMatched`). |
| 5 | Model OCR | ✏️ Default **`claude-sonnet-5`** (bukan opus) — cuma baca nominal, dipanggil berkali-kali/bulan, biaya diminimalin. Override via secret `ANTHROPIC_MODEL`. Toleransi match tetap `< Rp1.000`. |
| 6 | Cicilan+split: `responsible` selalu ∈ `splitMembers` | ✅ Benar. Constraint DB `bills_split_has_members` (≥2). |

## Data model: prototipe blob → tabel Supabase

Prototipe nyimpen 1 grup = 1 JSON di `window.storage`. Sekarang relasional:

| Prototipe | Tabel | Kunci |
|---|---|---|
| `account` (`kongsi:acct:<email>`) | `auth.users` + `public.profiles` | `profiles.wa` |
| `group` | `groups` | `code` unik, `pin` (plaintext, RLS jaga) |
| `group.members[]` | `group_members` | `(group_id, lower(email))` unik |
| `group.bills[]` | `bills` | field cicilan nullable kecuali `category='Cicilan'` |
| `group.monthly[YYYY-MM][billId]` | `bill_months` | `amount` override, `installment_advanced` |
| `...payments[memberName]` | `payments` | `(bill_id, month, member)` |
| `proofImage` (base64) | Storage bucket `proofs` | path `<group_id>/<bill_id>/<month>/<member>.jpg` |
| `kongsi:recent:<email>` | **belum** — rencana tabel `recent_groups` atau simpan lokal | daftar pribadi "Lanjutkan" |

**Penamaan:** kolom DB `snake_case`, domain TS `camelCase`. Mapping-nya nanti di
`src/lib/*-repository.ts` (belum dibuat). Contoh: `paid_count` ↔ `paidCount`,
`split_members` ↔ `splitMembers`.

### Identitas member (RLS)

Akses ke grup ditentukan **cuma** dari: apakah email JWT ada di
`group_members` grup itu. Fungsi `is_group_member(gid)` (SECURITY DEFINER,
biar nggak rekursi RLS) dipakai semua policy. PIN 6 digit dicek di client
sebagai gate kedua setelah identitas ketemu — persis alur brief.

`create_group(name, pin, members jsonb)` RPC (SECURITY DEFINER) bikin grup +
members atomik, dan nolak kalau email pemanggil nggak ada di `members`.

## Auth flow

`src/features/auth/auth-context.tsx`:

- `signUp({email,password,wa})` → `supabase.auth.signUp`, `wa` masuk
  `user_metadata`. Kalau email confirmation aktif (default), balikin
  `{ needsVerification: true }`.
- `verifyEmail({email,token})` → `verifyOtp({type:'signup'})`. Setelah ada
  session, `wa` disalin ke `profiles` (`syncProfile`).
- `signIn`, `signOut`, `resendCode` standar.
- Session persist di `expo-secure-store`, di-chunk 1800 char/key (limit iOS
  ~2KB). Web pakai `localStorage` (default supabase-js).
- `<AuthProvider>` di root `_layout.tsx`. Guard: `(auth)/_layout` redirect ke
  `(app)` kalau ada session; `(app)/_layout` redirect ke `(auth)/login` kalau
  nggak. PIN grup = gate UX kedua (`features/groups/unlocked-groups.ts`,
  in-memory) — RLS yang jaga data beneran.

## OCR flow

Client → upload foto ke Storage (`proofs.ts uploadProof`) → panggil Edge
Function `read-proof` (`readProof`) dengan base64 → function panggil Anthropic
vision → balikin `{ amount }` → client jalanin
`applyProofUpload(bill, record, { ocrAmount, ... })` → `commitBillRecord`
(tulis `payments` + `bill_months` + `bills.paid_count` kalau berubah).
Alur status/aksi lain: `applySelfDeclare` / `applyConfirm` / `applyReject` /
`applyReupload` → `commitBillRecord` / `writeMonthRecord`. UI-nya belum ada.

Key Anthropic **cuma** di secret Edge Function, nggak pernah di bundle app.

## Cara jalanin (dev)

```bash
npm test         # unit test domain (tsx --test)
npm run typecheck  # tsc app + tsc config test
npm start        # expo dev server (butuh .env terisi)
```

> Catatan lingkungan: repo ada di WSL, node dari nvm
> (`~/.nvm/versions/node/v24.21.0/bin`). Helper `.dev/*.sh` (gitignored) cuma
> buat nambahin PATH itu.

## Langkah berikutnya

Semua item brief + penambahan (OCR anti-fraud, push, realtime, light mode,
hardening, gold accent, auto-kapital, keyboard "Selesai", undangan anggota,
badge Lanjutkan, Nomor HP + kode negara, i18n id/en) sudah kelar. Sisanya:

1. **Top-up kredit Anthropic** — function jalan tapi API balikin "credit
   balance too low". Sampai di-isi, upload bukti masuk `review` (nggak
   auto-`paid`). Semua alur status lain jalan tanpa OCR.
2. **Dev build buat push** — `eas init` + `eas build --profile development`
   (lihat `docs/PUSH_SETUP.md`). Kode push sudah ada, no-op tanpa `projectId`.
3. **Email OTP template** — pastiin `{{ .Token }}` (atau matiin "Confirm
   email" buat dev). Lihat `docs/SUPABASE_SETUP.md`.
4. Polish gaya iOS dari prototipe (spacing, animasi, salin kode grup, custom
   date-picker popup, empty states).
5. Resize gambar bukti sebelum upload (`expo-image-manipulator`).
6. Deep-link dari notif ke layar grup (`data.groupId` udah dikirim).

Yang ditunda (brief): WhatsApp API asli, lunasi-dipercepat untuk split,
fitur agentic.

### Catatan / utang teknis

- Akun Anthropic $0 credit → OCR error sampai di-top-up. Key + model keset
  sebagai Supabase secret.
- Push: butuh dev build + EAS `projectId`; no-op sampai itu ada.
- Notif client-driven (abis `submitProof`) — DB trigger + `pg_net` lebih
  tahan banting.
- "Member lain yang relevan" belum di-fan-out — cuma PJ.
- Gambar bukti belum di-resize (cuma `quality: 0.6` di picker).
- i18n: nama kategori tagihan tetap Indonesia (DB enum); body push notif
  (`notify-proof`) tetap Indonesia — belum ikut locale user.
- `@types/node`/`node --test` warning `MODULE_TYPELESS_PACKAGE_JSON` — kosmetik.
- Migrasi lokal diedit in-place beberapa kali; `supabase db reset` bakal
  replay bener. Fungsi/skema di DB live udah sinkron.
