# Kongsi — Arsitektur & Status Port

Dokumen ini nyatet keputusan porting dari prototipe (`kongsi-pilot.html`) ke
React Native (Expo SDK 57) + Supabase. Dibaca bareng `PROJECT_BRIEF.md`.

## Status

| Bagian | Lokasi | Catatan |
|---|---|---|
| Tipe domain | `src/types/models.ts` | 1:1 dengan data model di brief |
| Logika billing/cicilan/status | `src/domain/{billing,money,dates}.ts` | port murni, dependency-free |
| Unit test | `src/**/*.test.ts` | 50 test, `npm test` (pakai `tsx`) |
| Skema DB + RLS | `supabase/migrations/0001_init.sql` | **belum dijalankan** — lihat `SUPABASE_SETUP.md` |
| Edge Function OCR | `supabase/functions/read-proof/` | Deno, Anthropic vision (default `claude-sonnet-5`) |
| Supabase client | `src/lib/supabase.ts` | session di `expo-secure-store` (chunked) |
| Auth context | `src/features/auth/auth-context.tsx` | register → OTP → login, di-wire di root `_layout` |
| Repository layer | `src/lib/*-repository.ts`, `mappers.ts`, `proofs.ts` | row ↔ domain, semua lewat RLS |
| Routing auth-gated | `src/app/_layout.tsx` + `(auth)/` `(app)/` | Stack + guard + Supabase config gate |
| Layar auth | `src/app/(auth)/{login,register,verify}.tsx` | fungsional, Enter submit, tombol disable |
| Layar Home / Buat / Join / Login grup | `src/app/(app)/*` | fungsional (recent list, create RPC, join lookup, PIN) |
| Dashboard grup + Tambah tagihan | `src/app/(app)/group/[id]/*` | **skeleton** — fetch + selector jalan, UI penuh belum |

Produksi bundle (`expo export --platform ios`) sukses; `npm run typecheck` bersih.

**Belum dikerjakan:** dashboard tab Tagihan/Ringkasan penuh (card per bill,
expand rincian per orang, chart tren, export Excel/PDF, generator reminder),
form Tambah tagihan, alur upload bukti + OCR di UI, realtime, polish gaya
dark/iOS. Urutan di "Langkah berikutnya".

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
  migrations/0001_init.sql   functions/read-proof/index.ts   config.toml
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

Sudah kelar: repository layer, routing, layar auth, Home, Buat/Join/Login grup.
Sisanya:

1. **Tambah tagihan** (brief §5) — form: kategori (ikon+warna, `CategoryColors`/
   `CategoryIcons`), tanggal jatuh tempo diketik manual, tipe single/split,
   field `tenor` + toggle "total ÷ tenor" kalau kategori Cicilan, pilih PJ /
   splitMembers + "transfer ke siapa". Domain-nya (`perInstallmentFromTotal`,
   dll) udah siap → `insertBill`.
2. **Dashboard tab Tagihan** (brief §6) — card per bill, expand rincian per
   orang (`monthlyOverview`, `billBadge`, `billMetaText`, `expectedShare`),
   "Edit nominal" (PJ only, `canEditNominal` → `updateBillEstimate`).
3. **Upload bukti + alur status** (brief §7) — image picker → `uploadProof` →
   `readProof` → `applyProofUpload` → `commitBillRecord`; tombol per status
   (`review`: "Upload ulang" / "Tandai…"; `awaiting`: PJ "Konfirmasi"/"Tolak").
   Card jangan auto-collapse.
4. **Dashboard tab Ringkasan** — kartu "siapa belum bayar" (jangan default
   "Lunas" kalau `!hasDues`), chart tren (`computeMonthlyCategoryTotals` +
   `loadAllMonths`), export Excel/PDF, generator teks reminder
   (`buildReminderText`).
5. **Lunasi dipercepat** single (`earlyPayoffInfo` / `applyEarlyPayoff`).
6. Realtime (`supabase.channel`) biar dashboard update pas anggota lain bayar.
7. Polish gaya dark/iOS dari prototipe (spacing, card, badge, animasi).

Yang ditunda (brief): push/WhatsApp asli, lunasi-dipercepat untuk split,
fitur agentic.

### Catatan / utang teknis

- Supabase client belum di-generic-type (`Database`) — repo pakai cast manual
  ke row types. Jalanin `supabase gen types typescript --linked` begitu project
  ada, lalu balikin `<Database>` di `supabase.ts`.
- RLS `bills` UPDATE masih lebar (semua anggota). "Edit nominal = PJ only"
  baru di UI — bisa dikencengin pakai trigger nanti.
- `app-tabs`, `animated-icon`, dll dari template starter udah dihapus.
