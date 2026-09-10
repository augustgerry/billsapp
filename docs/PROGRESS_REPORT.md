# Kongsi — Ringkasan Progress (per 2026-09-10)

Port prototipe `kongsi-pilot.html` → **React Native (Expo SDK 57) + Supabase**.
22 komit di `main`, di atas `27d9c4e` (brief + prototipe).

---

## 1. Fondasi & domain logic

- **`src/domain/`** — port murni aturan bisnis (dependency-free, 56 unit test
  `npm test`): `billing.ts` (requiredMembers, maybeAdvanceInstallment, event
  functions, selector dashboard), `money.ts`, `dates.ts`, `text.ts`, `i18n.ts`.
- **`src/types/models.ts`** — tipe 1:1 sama data model brief.
- **2 perubahan sengaja dari prototipe** (didokumentasiin): guard idempotensi
  cicilan (`installmentAdvanced`), `ocrMatched` beneran disimpan.
- **Koreksi user yang diterapin:** jalur "Upload ulang" dari status `review`
  (Q3); default model OCR `claude-sonnet-5` (Q5).

## 2. Backend Supabase — **LIVE** di project `wyhihlddtnbyqvjutjyf` (ap-southeast-1)

- **6 migrasi di-apply** (`supabase/migrations/`): 8 tabel + RLS penuh, RPC
  (`create_group`, `get_group_for_join`, `duplicate_group`, `list_my_invites`,
  `respond_to_invite`, `push_tokens_for_group_member`), bucket storage
  `proofs`, trigger edit-nominal, realtime publication.
- **Identitas:** akses grup = email JWT cocok di `group_members` + status
  `active`. PIN = gate kedua di client.
- **2 edge function deployed:**
  - `read-proof` — OCR bukti transfer (Anthropic vision). Balikin
    `amount` + `isReceipt` + `platform` + `suspiciousNote`.
  - `notify-proof` — push ke PJ abis upload bukti (service role).
- `src/lib/` — repository layer typed (`createClient<Database>`, types
  di-generate), mapper row↔domain, `proofs.ts`, `attention-repository.ts`.
- `.env` terisi (URL + publishable key).

## 3. App — semua layar brief + penambahan

| Area | Status |
|---|---|
| Auth (register + kode negara / login / OTP email) | ✅ |
| Home (Lanjutkan, Undangan, badge notif, buat/join) | ✅ |
| Buat grup / Join grup / Login grup (PIN) | ✅ |
| Tambah tagihan (kategori, tanggal manual, single/split, blok Cicilan) | ✅ |
| Dashboard tab **Tagihan** (hero kontribusi, card per bill, expand rincian, Edit nominal) | ✅ |
| Upload bukti + alur status (upload→OCR→paid/review/awaiting, self-declare / confirm / reject / upload ulang, lunasi dipercepat single, lihat bukti) | ✅ |
| Dashboard tab **Ringkasan** (siapa belum bayar, chart tren, export CSV + PDF, generator reminder) | ✅ |
| Pengaturan (info akun, tema, bahasa, keluar) | ✅ |

## 4. Penambahan dari feedback testing

- **Realtime** — dashboard auto-refresh pas anggota lain update pembayaran.
- **Push notification** — registrasi token + kirim ke PJ (kode siap; butuh
  dev build buat tes, lihat `docs/PUSH_SETUP.md`).
- **Light mode + toggle** Terang/Gelap/Ikuti Sistem (persist per device).
- **Gold accent** — `primary` biru iOS → gold muted (`#D6AE52` dark /
  `#9C7A1E` light), token `primaryOn` biar teks di tombol gold kebaca. Warna
  status & kategori tetap.
- **Auto-kapital** nama grup/anggota/tagihan pas diketik.
- **Sistem undangan** — anggota baru status `pending` sampai terima; section
  "Undangan" di Home; pending nggak bisa jadi PJ/split.
- **Badge notifikasi** merah di kartu "Lanjutkan" — jumlah pembayaran yang
  butuh konfirmasi user (cuma PJ yang lihat).
- **Bar "Selesai"** di atas keyboard angka (iOS).
- **Ikon gerigi** ganti teks "Pengaturan" di Home.
- **Nomor HP + kode negara** (dropdown ~130 negara, default +62, simpan
  format `+62812…`, validasi generik).
- **i18n** — toggle Bahasa Indonesia / English di Pengaturan, ~200 string +
  domain display strings.
- **Hardening** — trigger DB "cuma PJ yang bisa edit nominal", export PDF
  (`expo-print`), `supabase gen types`.

## 5. Hardening & kualitas

- Setiap komit: `npm run typecheck` bersih + 56 test lulus + `expo export
  --platform ios` sukses (bundle jalan).
- Kredensial (token, DB password) cuma dipakai sekali per operasi; script-nya
  dihapus. `.env` di-gitignore.

---

## Yang masih perlu dari lo

1. **Top-up kredit Anthropic** (console.anthropic.com) — function jalan tapi
   API balikin "credit balance too low". Sampai diisi, upload bukti masuk
   `review` (nggak auto-`paid`); alur status lain jalan normal.
2. **Template email OTP** — Authentication → Emails → Confirm signup →
   pastiin ada `{{ .Token }}` (atau matiin "Confirm email" buat dev).
3. **Dev build buat push** — `eas init` + `eas build --profile development`
   (`docs/PUSH_SETUP.md`).

## Sisa pekerjaan (bukan blocker)

Polish gaya iOS (spacing, animasi, custom date-picker popup, salin kode
grup), resize gambar bukti sebelum upload, deep-link dari notif, terjemahin
nama kategori + body push notif, notif fan-out ke non-PJ.

## Batch "testing feedback #2" (2026-09-11)

- **Bug render "buat bill"** — file `add-bill.rtest.tsx` nyangkut di `src/app/`,
  ke-bundle Expo Router → narik `@testing-library` → `require('console')`
  gagal di Metro. Dipindah ke `src/__rtests__/`. Ada render smoke test
  (`npm run test:render`, jest-expo) yang ngejalanin alur create bill.
- **1** Kebab menu di "Lanjutkan": `ActionSheet` + `PromptDialog` (ganti
  `Alert.prompt` yang iOS-only); "Hapus" konfirmasi dulu, "Duplikat" bisa
  ganti nama. RPC `duplicate_group` nambah arg opsional `p_name`.
- **2** `isValidEmail()` (domain/email.ts) — wajib TLD beneran; dipasang di
  sign-in / sign-up / anggota grup dengan error merah inline.
- **3** Field numerik (PIN dll.): tombol "Selesai" inline di Android
  (`TextField`), iOS tetap pakai InputAccessoryView.
- **4** Undangan real-time: `group_members` masuk publication + RLS
  "read own rows by email"; `useInvitesRealtime()` refresh Home.
- **5** Anggota `pending` bisa dipilih jadi PJ / split (ditandai "· diundang").
- **6** Kategori non-Cicilan: field tanggal hilang, badge cuma
  Lunas / Belum Lunas (`billBadge` kind `'unpaid'`).
- **7** `DateField` — satu field → popup terpadu (hari+bulan+tahun),
  bisa diketik `DD/MM/YYYY` dengan echo langsung.
- **8** Ikon kategori seragam (`CategoryIcon`, receipt-outline di lingkaran
  berwarna); chip pakai titik warna, bukan emoji. `categoryLabel()` id/en.
- **9** `Screen` keyboard-aware: field yang di-fokus auto-scroll di atas
  keyboard (`scrollResponderScrollNativeHandleToKeyboard`, tanpa dep baru).
- **10** Audit i18n: countdown ("in N days"), error export, kolom Type export.
- **11** Rebrand kuning (`#EAB308` / `#FACC15`). Logo "split ring" digenerate
  dari kode (`scripts/gen-logo.mjs`, pngjs) → icon + splash + adaptive icon.
  `<Wordmark>` di Home + layar auth. `name` app → "Kongsi".
- **12** Copy pass: Indonesia lebih rapi ("nggak"→"belum/tidak", dll.).
- **13** Kartu diseragamkan (surface + hairline + radius 16), field fokus
  dapat border aksen, Screen sembunyiin scroll indicator.

## Batch "testing feedback #3" (2026-09-11)

- **Bug 2 & 3 — render error "cannot add postgres_changes callbacks … after
  `subscribe()`"** (`use-group-realtime.ts` pas buat bill / balik dari
  Ringkasan). Akarnya: `supabase.channel(topic)` balikin channel yang **udah
  ada** kalau topic-nya sama, dan `removeChannel()` async — jadi mount kedua
  (bounce lewat group-login, pindah tab, Fast Refresh) narik channel yang udah
  `subscribe()` lalu manggil `.on()` → throw. Fix: `freshChannel()`
  (`src/lib/realtime.ts`) kasih topic unik per mount. Kena juga di
  `use-invites-realtime.ts`. Regression test: `group-realtime.rtest.tsx`.
- **Kosmetik 1** — tag "· diundang" di form Tambah tagihan dihapus; anggota
  pending tampil sama persis kayak anggota aktif (tetap bisa dipilih).
  Key i18n `bill.invitedTag` dibuang.
- **Kosmetik 2** — splash screen. Background `#FACC15` kuning terang diganti
  jadi warna background app (`#F6F6F4` light / `#0B0B0C` dark) + mark
  theme-aware (`splash-icon-dark.png` kuning buat dark). Sekarang splash
  nyambung mulus ke layar pertama, nggak ada kilatan kuning yang nabrak sama
  teks "Kongsi" putih pas fade. Accent kuning app **nggak** diubah (sesuai
  permintaan) — tetap `#EAB308` / `#FACC15`.
- **Bug 1 — sign up nggak ada OTP + "JWT issued at future"**: dua-duanya
  config/lingkungan, bukan bug kode. Ditambahin ke troubleshooting
  `docs/SUPABASE_SETUP.md`:
  - OTP: nyalain "Confirm email" di dashboard + template harus ada
    `{{ .Token }}` + SMTP default cuma kirim ke email tim (pasang custom SMTP).
  - "JWT issued at future": jam device/emulator meleset — set Date & time ke
    Automatic. (Register screen dirapihin: `setBusy(false)` jalan juga di jalur
    tanpa verifikasi.)
- Brief **poin 8** (gold muted `#D6AE52`/`#9C7A1E`) sengaja **tidak**
  diterapin — di-override sama rebrand kuning batch #2, dikonfirmasi user
  tetap kuning terang.

## Batch "pre–App Store" (2026-09-11) — poin 15–17

- **15 Hapus akun dari dalam app.** Menu "Hapus Akun" di Pengaturan (teks
  merah, di bawah "Keluar") → dialog peringatan `Alert` → baru hapus.
  - Migrasi `20260911010000_delete_account.sql`: RPC
    `delete_my_account_data()` (SECURITY DEFINER, jalan sebagai caller).
    Tiap grup yang dia buat: kepemilikan dialihkan ke anggota aktif tertua,
    atau grup dihapus kalau nggak ada anggota aktif lain. Keanggotaan
    caller di semua grup dihapus. `profiles` / `push_tokens` /
    `recent_groups` dibersihin (juga ke-cascade dari `auth.users`).
  - Edge function `delete-account` (`verify_jwt=true`): jalanin RPC pakai
    JWT user, lalu `auth.admin.deleteUser()`. Client: `deleteAccount()` di
    `auth-context`, session dibersihin → app balik ke layar login.
  - Deploy: `supabase db push && supabase functions deploy delete-account`.
- **16 Privacy Policy & Terms of Service.** Draft dwibahasa (id/en) di
  `src/features/legal/content.ts`, disesuaikan sama data yang app kumpulin
  (email, no HP, foto bukti, data grup/tagihan; Supabase; OCR lewat
  Anthropic). Layar statis `src/app/(app)/legal.tsx` (`?doc=privacy|terms`),
  link di Pengaturan section "LEGAL".
  - ⚠️ `CONTACT_EMAIL` = `support@kongsi.app` (placeholder) — ganti ke email
    yang beneran dipantau sebelum submit. Kalau store butuh URL publik,
    host teks yang sama di web.
  - Draft, bukan nasihat hukum — review dulu sebelum launch.
- **17 Metadata build production.** `app.json`: `ios.bundleIdentifier` +
  `android.package` = `com.app.kongsi`, `ios.buildNumber` "1",
  `android.versionCode` 1. `name` "Kongsi", `version` "1.0.0", `slug`
  "billsapp" (dibiarin — kepake EAS project). Icon + splash udah pakai
  logo final rebrand (`scripts/gen-logo.mjs`).
- Tes: `settings-legal.rtest.tsx` (2) — Hapus Akun konfirmasi dulu +
  layar Legal render dua dokumen.

## Cara jalanin

```bash
npm test            # 58 domain test (tsx)
npm run test:render # 11 render smoke test (jest-expo)
npm run typecheck   # bersih
npm start           # atau: npx expo start --tunnel
```

Detail lengkap: `docs/ARCHITECTURE.md`, `docs/SUPABASE_SETUP.md`,
`docs/PUSH_SETUP.md`.
