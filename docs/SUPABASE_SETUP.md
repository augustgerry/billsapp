# Setup Supabase untuk Kongsi

Status project `wyhihlddtnbyqvjutjyf` (region ap-southeast-1) — **LIVE**:
- ✅ `.env` terisi (URL + publishable key)
- ✅ **8 migrasi** di-apply (8 tabel, RLS penuh, semua RPC, bucket `proofs`,
  trigger edit-nominal, realtime publication, undangan anggota, hapus akun)
- ✅ Edge functions **deployed**: `read-proof`, `notify-proof`, `delete-account`
- ⚠️ Secret `ANTHROPIC_API_KEY` keset TAPI akun Anthropic **$0 credit** → OCR
  error sampai di-top-up
- ⚠️ **"Confirm email" saat ini OFF** — sign up langsung dapat sesi, nggak ada
  layar OTP. Nyalain sebelum produksi (langkah 5) + pasang custom SMTP.

Langkah di bawah buat referensi / setup dari nol.

## 1. Bikin project

1. https://supabase.com/dashboard → New project. Catat **Project URL** dan
   **anon public key** (Project Settings → API).
2. Region: pilih yang dekat (mis. Singapore).

## 2. Isi `.env`

```bash
cp .env.example .env
```

Isi:

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

`.env` udah di-gitignore. Restart `npm start` abis ngedit.

## 3. Install Supabase CLI & link

```bash
npm i -g supabase          # atau: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <ref>
```

`supabase/config.toml` udah ada (minimal). Kalau CLI minta `supabase init`,
jalanin — dia bakal pertahanin `project_id`.

## 4. Jalankan migrasi

```bash
supabase db push
```

Meng-apply 8 file di `supabase/migrations/` (urut):

| Migrasi | Isi |
|---|---|
| `..._init` | 7 tabel (`profiles`, `groups`, `group_members`, `bills`, `bill_months`, `payments`, `recent_groups`), RLS, RPC `create_group` / `get_group_for_join` / `duplicate_group`, bucket `proofs` |
| `..._proof_analysis` | kolom `is_receipt` / `platform` / `suspicious_note` hasil OCR |
| `..._push_tokens` | tabel `push_tokens` + RPC `push_tokens_for_group_member` |
| `..._realtime` | tabel `payments` / `bill_months` / `bills` masuk realtime publication |
| `..._guard_estimate` | trigger: cuma PJ yang bisa ubah nominal tagihan |
| `..._member_invites` | `group_members.status` (pending/active), RPC `list_my_invites` / `respond_to_invite` |
| `..._invites_realtime_and_duplicate_rename` | `group_members` masuk publication + RLS "read own rows by email"; `duplicate_group` bisa ganti nama |
| `..._delete_account` | RPC `delete_my_account_data()` |

Cek cepat di SQL editor:

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- semua harus rowsecurity = true
```

## 5. Auth settings (dashboard → Authentication)

**Status sekarang: "Confirm email" OFF** (biar dev nggak kepentok rate-limit
SMTP bawaan). Efeknya: sign up langsung dapat sesi, layar `verify` di-skip.

Buat **produksi** (wajib sebelum launch):

- **Providers → Email**: "Confirm email" = **ON**.
- **Project Settings → Authentication → SMTP**: pasang **custom SMTP** dengan
  **domain sendiri** (Resend / Postmark / SES / dll). SMTP bawaan Supabase cuma
  kirim ke email anggota tim + rate-limit sangat ketat — nggak cukup buat user
  beneran.
- **Email Templates → Confirm signup**: body harus ngirim `{{ .Token }}` (kode 6
  digit), bukan cuma `{{ .ConfirmationURL }}` — app minta kode manual, bukan link.
- **URL Configuration → Redirect URLs**: tambahin `billsapp://` dan URL dev Expo
  (`exp://` / `http://localhost:8081`).

Flow `verifyEmail` di app mengasumsikan "Confirm email" ON.

## 6. Edge Functions

Tiga function di `supabase/functions/`. Deploy semua sekaligus:

```bash
supabase functions deploy read-proof
supabase functions deploy notify-proof
supabase functions deploy delete-account
```

`notify-proof` (push ke PJ abis upload bukti) & `delete-account` (hapus akun)
nggak butuh secret tambahan — `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` /
`SUPABASE_ANON_KEY` otomatis ada di runtime edge.

### `read-proof` (OCR)

Set key Anthropic sebagai **secret** (bukan di `.env` app):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# opsional — default udah claude-sonnet-5:
supabase secrets set ANTHROPIC_MODEL=<model lain>
```

Deploy:

```bash
supabase functions deploy read-proof
```

Test:

```bash
curl -i -X POST "https://<ref>.functions.supabase.co/read-proof" \
  -H "Authorization: Bearer <anon key>" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"<base64 jpeg bukti transfer>"}'
# -> {"amount": 300000, "model": "claude-..."}
```

`verify_jwt = true` (di `config.toml`) — produksi harus pakai access token user,
bukan anon key.

### Catatan `delete-account` (hapus akun — wajib buat App Store)

Alurnya: client panggil fungsi dengan JWT user → fungsi jalanin RPC
`delete_my_account_data()` sebagai user itu (lepasin kepemilikan/keanggotaan
grup + hapus data pribadi) → `auth.admin.deleteUser()` hapus akun auth.
Grup yang masih ada anggota aktif lain: kepemilikan dialihkan ke anggota
tertua, grup tetap ada. Grup tanpa anggota aktif lain: kehapus (cascade).
Butuh migrasi `..._delete_account` (RPC) + function `delete-account` ter-deploy —
dua-duanya sudah live di project ini.

## 7. Storage

Bucket `proofs` (private) dibikin sama migrasi, plus policy: cuma anggota grup
yang bisa baca/tulis objek di bawah `<group_id>/...`. Nggak perlu setup manual.

## 8. Verifikasi RLS (opsional tapi disaranin)

Bikin 2 user test, 1 grup, cek user di luar grup nggak bisa `select` apa-apa:

```sql
-- sebagai user yang BUKAN anggota:
select * from groups;            -- harus kosong
select * from bills;             -- harus kosong
```

## Troubleshooting

| Gejala | Kemungkinan |
|---|---|
| App nampilin layar "Supabase belum dikonfigurasi" | `.env` kosong / belum restart Metro |
| `verifyOtp` selalu gagal | Template email ngirim link, bukan `{{ .Token }}` |
| Edge Function 500 "ANTHROPIC_API_KEY not configured" | `supabase secrets set` belum jalan / belum re-deploy |
| `create_group` error "Email kamu harus termasuk..." | email login nggak ada di list anggota (by design) |
| RLS "infinite recursion detected" | `is_group_member` kehilangan `security definer` — cek migrasi ke-apply utuh |
| Abis sign up langsung masuk, nggak ada layar OTP | "Confirm email" di dashboard OFF → `signUp` balikin session langsung. Nyalain "Confirm email" (langkah 5) biar `verify` muncul. |
| OTP nggak pernah nyampe email | (1) template belum ada `{{ .Token }}`; (2) default SMTP Supabase cuma kirim ke email anggota tim + rate-limit ketat — pasang custom SMTP buat testing beneran. |
| "JWT issued at future" / auth-js warning "issued in the future? Check the device clock" | Jam device/emulator meleset. Android emulator: Settings → System → Date & time → **Automatic**. Fisik: samain jam. Bukan bug app — token ditandatangani server, ditolak kalau `iat` > jam pemeriksa. |
