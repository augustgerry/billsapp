# Kongsi — Arsitektur & Status (terkini)

Port prototipe `kongsi-pilot.html` → **React Native (Expo SDK 57) + Supabase**.
Dokumen ini adalah snapshot status paling baru. Dibaca bareng `PROJECT_BRIEF.md`
(spesifikasi), `docs/SUPABASE_SETUP.md` (backend), `docs/PUSH_SETUP.md` (notif).

Terakhir diperbarui: **2026-09-11**.

- Repo: `main` sinkron dengan `origin/main`.
- Supabase project: `wyhihlddtnbyqvjutjyf` (region `ap-southeast-1` / Singapore) — **LIVE**.
- Kualitas: `npm run typecheck` bersih · **58** domain test + **11** render test lulus ·
  `expo export` (iOS & Android) sukses tanpa warning · `expo-doctor` 21/21.

---

## 1. Fitur yang SUDAH selesai & berfungsi

### Auth & identitas
- Daftar (email + password + Nomor HP dengan **kode negara**, ~130 negara, disimpan
  format `+62…`), login, verifikasi OTP email, kirim ulang kode, keluar.
- Sesi persist di `expo-secure-store` (di-chunk 1800 char/key — limit iOS ~2 KB).
- **Hapus akun** dari dalam app (Pengaturan) — dialog peringatan dulu, lalu edge
  function `delete-account`: lepas kepemilikan/keanggotaan grup + hapus data
  pribadi, lalu `auth.admin.deleteUser`. Grup yang masih ada anggota aktif lain
  tetap ada (kepemilikan pindah ke anggota tertua); grup tanpa anggota lain
  kehapus. **Terverifikasi end-to-end lawan project live.**
- Identitas grup = email JWT cocok di `group_members` + status `active`. PIN 6
  digit = gate UX kedua di client; RLS yang jaga data.

### Grup
- Buat grup (RPC `create_group`, atomik, pembuat `active` / sisanya `pending`).
- Join via kode + lookup (`get_group_for_join`), masuk grup dengan PIN.
- **Sistem undangan**: anggota baru `pending` sampai menerima. Section "Undangan"
  di Home (dicari dari email login vs email pending di semua grup), tombol
  Terima / Tolak, real-time (`use-invites-realtime`).
- Kebab menu di "Lanjutkan": **Duplikat** (grup baru, anggota sama, tanpa
  tagihan, bisa ganti nama) & **Hapus dari daftar** (konfirmasi dulu).
- **Badge notifikasi merah** di kartu "Lanjutkan" — jumlah pembayaran yang perlu
  dikonfirmasi user; **cuma PJ** yang lihat.

### Tagihan & pembayaran
- Tambah tagihan: kategori (6 jenis), single / split, blok Cicilan (tenor, sudah
  dibayar berapa kali, mode total vs per bulan, siapa yang menalangi).
- **Date picker terpadu** (`DateField`) — satu field, popup hari+bulan+tahun,
  bisa diketik `DD/MM/YYYY`. Tanggal jatuh tempo **cuma** untuk Cicilan.
- Dashboard tab **Tagihan**: hero kontribusi, kartu per bill, expand rincian,
  Edit nominal (dijaga trigger DB — cuma PJ).
- Upload bukti transfer → OCR → status (`unpaid`/`paid`/`review`/`awaiting`),
  self-declare / konfirmasi / tolak / upload ulang, lunasi dipercepat (single),
  lihat bukti.
- Dashboard tab **Ringkasan**: "siapa belum bayar", grafik tren per kategori,
  export **CSV + PDF** (`expo-print`), generator teks reminder + salin.
- Anggota `pending` sudah bisa dipilih jadi PJ / anggota split (tanpa label
  khusus).

### Realtime
- `use-group-realtime` — dashboard auto-refresh saat anggota lain update
  pembayaran. Channel pakai topic unik per mount (`src/lib/realtime.ts`) supaya
  nggak kena error "cannot add postgres_changes callbacks after subscribe()".

### OCR bukti transfer (edge function `read-proof`)
- Deployed. Kirim foto → Anthropic vision → `{ amount, isReceipt, platform,
  suspiciousNote }`. Model default `claude-sonnet-5` (override via secret
  `ANTHROPIC_MODEL`). Toleransi match `< Rp1.000`.
- ⚠️ Butuh kredit Anthropic (lihat §2). Tanpa kredit, upload bukti masuk
  `review` — semua alur status lain tetap jalan.

### Push notification (edge function `notify-proof`)
- Deployed. Setelah upload bukti, PJ tagihan dapat push (service role cari
  device token lewat `push_tokens_for_group_member`, kirim ke Expo Push API).
- Kode client (`features/notifications/*`) siap. **No-op sampai ada Development
  Build + EAS `projectId`** (lihat §2 & `docs/PUSH_SETUP.md`).

### Tampilan & bahasa
- **Light / Dark / Ikuti Sistem**, persist per device.
- Accent **kuning** (`#EAB308` light / `#FACC15` dark) + token `primaryOn`
  (teks gelap di atas tombol kuning). Warna status (hijau/merah/oranye) &
  kategori tagihan **tidak** ikut berubah.
- **i18n Indonesia / English** — toggle di Pengaturan, ~220 string + domain
  display strings (tanggal, badge, meta tagihan, reminder, export).
- Auto-kapital nama (grup/anggota/tagihan) saat diketik.
- Toolbar "Selesai" di atas keyboard angka (iOS `InputAccessoryView`, Android
  tombol inline).
- Form keyboard-aware (field yang di-fokus auto-scroll di atas keyboard).
- Ikon gerigi (bukan teks) untuk Pengaturan di Home.
- Brand mark "split ring" + wordmark "Kongsi", di-generate dari kode
  (`scripts/gen-logo.mjs`) → app icon, splash (light + dark), adaptive icon,
  favicon. Splash background = warna background app biar transisi mulus.
- Halaman **Legal** (Kebijakan Privasi & Syarat/Ketentuan), dwibahasa,
  di-link dari Pengaturan.

### Metadata build
- `app.json`: `name` "Kongsi", `version` "1.0.0", `ios.bundleIdentifier` &
  `android.package` = `com.app.kongsi`, `ios.buildNumber` "1",
  `android.versionCode` 1. `slug` "billsapp" (dipertahankan — dipakai EAS).

---

## 2. Yang masih PENDING dari sisi kamu (bukan pekerjaan kode)

| # | Item | Kenapa perlu / dampak sekarang |
|---|---|---|
| 1 | **Akun Apple Developer** ($99/th) | Wajib buat build & submit ke App Store dan buat dev build iOS. |
| 2 | **Google Play Console** ($25 sekali) | Wajib buat rilis ke Play Store (internal testing sekalipun). |
| 3 | **Isi kredit Anthropic** (console.anthropic.com) | `read-proof` deployed tapi API balikin "credit balance too low". Sampai diisi, OCR nggak jalan → upload bukti masuk `review` manual. Semua fitur lain normal. |
| 4 | **Development Build buat push** | `eas init` (bikin `extra.eas.projectId`) + `eas build --profile development`. Expo Go SDK 53+ nggak support remote push. Tanpa ini `registerPushToken` no-op. Langkah lengkap: `docs/PUSH_SETUP.md`. |
| 5 | **Domain sendiri + custom SMTP buat email OTP produksi** | SMTP bawaan Supabase cuma kirim ke email anggota tim + rate-limit ketat, dan "Confirm email" saat ini **OFF** (sign up langsung dapat sesi, nggak ada layar OTP). Buat produksi: nyalain "Confirm email", pasang custom SMTP (Resend/Postmark/SES) dengan domain sendiri, pastikan template "Confirm signup" pakai `{{ .Token }}`. Detail: `docs/SUPABASE_SETUP.md` §5. |
| 6 | **Testing bareng user asli** | Alur 2+ orang (undangan, split, konfirmasi pembayaran, badge PJ, push) paling meyakinkan diuji dengan device + akun beneran, bukan emulator. |

Catatan device: kalau muncul **"JWT issued at future"**, jam device/emulator
meleset — set Date & time ke Automatic. Bukan bug app.

---

## 3. Struktur folder

```
src/
  app/                          # expo-router (file-based routing)
    _layout.tsx                 # providers (tema, locale, Supabase gate, Auth) + Stack + splash
    index.tsx                   # redirect: ada sesi -> (app), else (auth)/login
    (auth)/{login,register,verify}.tsx + _layout.tsx
    (app)/
      _layout.tsx               # guard sesi + daftar Stack.Screen
      index.tsx                 # Home (Undangan, Lanjutkan + badge, Buat/Join)
      create-group.tsx  join-group.tsx  group-login.tsx  settings.tsx  legal.tsx
      group/[id]/{index,add-bill}.tsx   # dashboard (Tagihan/Ringkasan) + form tagihan
  domain/                       # aturan bisnis MURNI — tidak impor React/RN
    billing.ts money.ts dates.ts text.ts email.ts category.ts i18n.ts + *.test.ts
  types/models.ts               # tipe domain (camelCase), 1:1 dgn data model brief
  lib/                          # jembatan ke Supabase
    env.ts supabase.ts realtime.ts
    db.ts                       # alias tipe di atas database.types.ts (generated)
    database.types.ts           # `supabase gen types` — JANGAN diedit tangan
    mappers.ts                  # row (snake_case) <-> domain (camelCase)
    {groups,bills,payments,recent-groups,attention}-repository.ts  proofs.ts
  features/
    auth/         auth-context.tsx  country-codes.ts  phone-field.tsx
    groups/       use-group-realtime.ts  use-invites-realtime.ts  unlocked-groups.ts
    bills/        bill-card.tsx  category-icon.tsx  proof-actions.ts  pick-proof-image.ts
    summary/      owed-card.tsx  trend-chart.tsx  export-rekap.ts
    notifications/ push.ts  notify.ts
    settings/     locale.tsx  strings.ts  theme-preference.tsx
    legal/        content.ts   # draft Privacy Policy + ToS (id/en)
  components/
    ui/           Screen Button TextField DateField Segmented ActionSheet
                  PromptDialog LoadingScreen TextLink keyboard-*  ...
    brand/wordmark.tsx   supabase-gate.tsx   themed-text.tsx
  hooks/use-theme.ts
  constants/theme.ts            # palet light + dark, warna kategori, spacing
  __rtests__/                   # render smoke test (jest-expo) — TIDAK di src/app/

supabase/
  migrations/*.sql              # 8 file, semua applied ke project live
  functions/{read-proof,notify-proof,delete-account}/   # Deno edge functions
  config.toml                   # config CLI minimal (+ verify_jwt per function)

scripts/gen-logo.mjs            # generate semua aset brand dari kode (pngjs)
docs/                           # dokumen ini + SUPABASE_SETUP + PUSH_SETUP
```

**Aturan lapisan:** `domain/` tidak boleh impor React/RN/Supabase (murni, di-test
dengan `tsx --test`). `lib/` yang ngomong ke Supabase & map row↔domain. `features/`
& `app/` yang nyambungin ke UI. Kolom DB `snake_case`, domain TS `camelCase`.

---

## 4. Arsitektur singkat

### Data model (prototipe blob → tabel relasional)

| Prototipe | Tabel | Kunci |
|---|---|---|
| `account` | `auth.users` + `public.profiles` | `profiles.wa` (Nomor HP) |
| `group` | `groups` | `code` unik, `pin` (plaintext, RLS jaga) |
| `group.members[]` | `group_members` | `(group_id, lower(email))` unik, `status` pending/active |
| `group.bills[]` | `bills` | field cicilan nullable kecuali `category='Cicilan'` |
| `group.monthly[YYYY-MM][billId]` | `bill_months` | `amount` override, `installment_advanced` |
| `...payments[member]` | `payments` | `(bill_id, month, member)` |
| `proofImage` (base64) | Storage bucket `proofs` (privat) | `<group_id>/<bill_id>/<month>/<member>.jpg` |
| `kongsi:recent:<email>` | `recent_groups` | daftar pribadi "Lanjutkan" (hide ≠ delete grup) |
| device push token | `push_tokens` | `(user_id, token)` |

Migrasi (urut): `init` → `proof_analysis` → `push_tokens` → `realtime` →
`guard_estimate` → `member_invites` → `invites_realtime_and_duplicate_rename` →
`delete_account`.

### RLS

Semua akses lewat `is_group_member(gid)` (SECURITY DEFINER, `status='active'`,
biar nggak rekursi). Grup nggak punya policy DELETE — dihapus cuma lewat RPC
(`delete_my_account_data`) atau cascade. RPC penting (semua SECURITY DEFINER):
`create_group`, `get_group_for_join`, `duplicate_group`, `list_my_invites`,
`respond_to_invite`, `delete_my_account_data`, `push_tokens_for_group_member`.

### Auth flow

`signUp` → (kalau "Confirm email" ON) `{ needsVerification: true }` → `verify`
screen → `verifyOtp({type:'signup'})`. Setelah ada sesi, `wa` disalin ke
`profiles`. `<AuthProvider>` di root. `(auth)/_layout` redirect ke `(app)` kalau
ada sesi; `(app)/_layout` sebaliknya.

### OCR flow

Client upload foto ke Storage → panggil `read-proof` (base64) → Anthropic vision
→ `{ amount, ... }` → `proof-actions.ts` hitung match → tulis `payments` +
`bill_months` + `bills.paid_count`. Key Anthropic **cuma** di secret edge
function, nggak pernah di bundle app.

### 3 perubahan sengaja dari prototipe

1. **Guard idempotensi cicilan** (`MonthRecord.installmentAdvanced`) — `paidCount`
   nggak bisa naik dua kali dalam sebulan walau ada event `paid` berulang.
2. **`ocrMatched` beneran disimpan** — prototipe nyebut field ini tapi nggak
   pernah nge-set; sekarang diisi tiap upload buat konteks PJ.
3. **Jalur "Upload ulang" dari `review`** — pengupload bisa reset ke `unpaid` +
   hapus bukti lama buat foto ulang (beda dari "Tandai sudah bayar" → `awaiting`).

### Pertanyaan terbuka (dikonfirmasi user 2026-09-09)

| # | Isu | Keputusan |
|---|---|---|
| 1 | `paidCount` nggak turun kalau `awaiting` ditolak setelah sempat "lunas" | Ikut prototipe: **tidak** decrement. |
| 2 | PJ nggak bisa dorong pembayaran split dari `review` | Ikut prototipe: hanya pengupload. |
| 3 | `review` nggak punya "Tolak" | Dibenerin — "Upload ulang". |
| 4 | Simpan hasil OCR + flag match | Ya (`amount`, `ocrMatched`). |
| 5 | Model OCR | Default `claude-sonnet-5`, override via secret. |
| 6 | Cicilan+split: `responsible` ∈ `splitMembers` | Benar, dijaga constraint DB. |

Brief **poin 8** (gold muted `#D6AE52`) **tidak** diterapkan — di-override rebrand
kuning, dikonfirmasi user tetap kuning terang.

---

## 5. Cara jalanin project dari awal

### Prasyarat
- Node 20+ (repo ini pakai **24.21.0** via nvm di WSL).
- (Backend) Supabase CLI: `npm i -g supabase`.
- (Dev build / store) EAS CLI: `npm i -g eas-cli` + akun Apple / Google.

### Frontend (dev, cukup buat lihat app jalan)

```bash
git clone <repo> kongsi && cd kongsi
npm install

cp .env.example .env
# isi EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
# (Dashboard Supabase -> Project Settings -> API). Lihat docs/SUPABASE_SETUP.md.

npm run typecheck        # tsc app + tsc config test — harus bersih
npm test                 # 58 domain test (tsx --test)
npm run test:render      # 11 render smoke test (jest-expo)

npm start                # Expo dev server
# tekan 's' -> buka di Expo Go (SDK 57) di HP, atau:
npx expo start --tunnel  # kalau HP beda jaringan
```

Semua fitur jalan di **Expo Go** kecuali **push notification** (butuh dev build).

### Backend (kalau bikin project Supabase baru — yang sekarang sudah LIVE)

```bash
supabase login
supabase link --project-ref <ref>
supabase db push                                 # apply 8 migrasi
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy read-proof
supabase functions deploy notify-proof
supabase functions deploy delete-account
```

Lalu setel Auth di dashboard (Confirm email, template OTP `{{ .Token }}`,
Redirect URLs `billsapp://`). Detail lengkap: `docs/SUPABASE_SETUP.md`.

### Production build

```bash
eas init                 # bikin extra.eas.projectId di app.json
eas build:configure
eas build --profile production --platform ios       # butuh Apple Developer
eas build --profile production --platform android   # butuh Play Console
```

Sebelum submit: ganti `CONTACT_EMAIL` di `src/features/legal/content.ts` ke email
yang beneran dipantau (dan host teksnya di URL publik kalau store minta link).

> Lingkungan repo: node dari nvm (`~/.nvm/versions/node/v24.21.0/bin`). Helper
> `.dev/*.sh` (gitignored) cuma buat nambahin PATH itu.

---

## 6. Utang teknis / catatan

- **"Confirm email" OFF** di project live sekarang — sign up langsung dapat sesi.
  Nyalain sebelum produksi (butuh custom SMTP, §2 #5).
- Notif client-driven (dipanggil habis `submitProof`) — lebih tahan banting kalau
  jadi DB trigger + `pg_net`.
- Notif cuma ke **PJ**, belum fan-out ke anggota split lain.
- Body push notif (`notify-proof`) & nama kategori tagihan (DB enum) tetap
  Indonesia — belum ikut locale user.
- Gambar bukti belum di-resize sebelum upload (cuma `quality: 0.6` di picker) —
  kandidat `expo-image-manipulator`.
- Belum ada deep-link dari notif ke layar grup (`data.groupId` sudah dikirim).
- Beberapa dependency dari template `create-expo-app` (`@expo/ui`,
  `expo-glass-effect`, `expo-symbols`, `react-native-reanimated`) belum dipakai
  di `src/` — bisa di-prune.
- Migrasi lokal pernah diedit in-place; `supabase db reset` tetap replay benar,
  skema live sudah sinkron.
