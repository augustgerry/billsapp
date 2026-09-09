# Kongsi — Arsitektur & Status Port

Dokumen ini nyatet keputusan porting dari prototipe (`kongsi-pilot.html`) ke
React Native (Expo SDK 57) + Supabase. Dibaca bareng `PROJECT_BRIEF.md`.

## Status per increment ini

Sudah selesai (fondasi, belum ada layar):

| Bagian | Lokasi | Catatan |
|---|---|---|
| Tipe domain | `src/types/models.ts` | 1:1 dengan data model di brief |
| Logika billing/cicilan/status | `src/domain/{billing,money,dates}.ts` | port murni, dependency-free |
| Unit test domain | `src/domain/*.test.ts` | 40 test, `npm test` (pakai `tsx`) |
| Skema DB + RLS | `supabase/migrations/0001_init.sql` | **belum dijalankan** — lihat `SUPABASE_SETUP.md` |
| Edge Function OCR | `supabase/functions/read-proof/` | Deno, panggil Anthropic vision |
| Supabase client | `src/lib/supabase.ts` | session di `expo-secure-store` (chunked) |
| Auth context | `src/features/auth/auth-context.tsx` | register → OTP → login, belum di-wire ke `_layout` |

**Belum dikerjakan:** semua layar/UI, routing auth-gated, repository layer
(mapping row Supabase ↔ tipe domain), realtime, chart, export Excel/PDF,
generator reminder di UI. Urutan lanjutan ada di bagian "Langkah berikutnya".

## Struktur folder

```
src/
  app/                 # expo-router (masih template starter)
  domain/              # aturan bisnis murni — TIDAK impor React/RN
    billing.ts         # requiredMembers, maybeAdvanceInstallment, event2, selector
    money.ts           # parseRupiah / formatRp / toleransi match
    dates.ts           # monthKey, daysStatus, dll
    *.test.ts
  types/models.ts      # tipe domain
  lib/
    env.ts             # EXPO_PUBLIC_* config
    supabase.ts        # client + ChunkedSecureStore
  features/
    auth/auth-context.tsx
supabase/
  migrations/0001_init.sql
  functions/read-proof/index.ts
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

Belum: wiring `<AuthProvider>` + routing auth-gated di `src/app/_layout.tsx`.

## OCR flow

Client (nanti) → upload foto ke Storage → panggil Edge Function `read-proof`
dengan base64 → function panggil Anthropic vision → balikin `{ amount }` →
client jalanin `applyProofUpload(bill, record, { ocrAmount, ... })` →
tulis hasil ke `payments` (+ `bills.paid_count` / `bill_months` kalau berubah).

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

## Langkah berikutnya (fase layar)

Urutan yang disaranin, ngikut brief:

1. **Repository layer** (`src/lib/`): `groups-repository.ts`,
   `bills-repository.ts`, `payments-repository.ts` — mapping row ↔ tipe domain,
   assemble `Group.monthly` dari `bill_months` + `payments`.
2. **Routing**: `src/app/_layout.tsx` jadi Stack + `<AuthProvider>`; grup
   `(auth)` (register/otp/login) dan `(app)` (home/group). Hapus template tabs.
3. **Layar auth** (brief §1): register, OTP, login. Enter submit, tombol
   disable sampai valid.
4. **Home** (brief §2): daftar "Lanjutkan" + duplikat/hapus dari daftar,
   buat grup / join kode.
5. **Buat grup** (brief §3) → RPC `create_group`.
6. **Login grup** (brief §4): auto-deteksi identitas dari email, input PIN,
   masuk begitu 6 digit benar.
7. **Tambah tagihan** (brief §5): field tenor muncul kalau kategori Cicilan;
   tanggal bisa diketik manual.
8. **Dashboard** (brief §6): tab Tagihan (card per bill, expand rincian) +
   Ringkasan (kartu "belum bayar" — jangan default "Lunas" kalau belum ada
   tagihan; chart tren; export; reminder).
9. **Upload bukti** (brief §7): Storage + Edge Function + alur status; card
   jangan auto-collapse abis upload.
10. Polish gaya dark/iOS dari prototipe.

Yang ditunda (brief): push/WhatsApp asli, lunasi-dipercepat untuk split,
fitur agentic.
