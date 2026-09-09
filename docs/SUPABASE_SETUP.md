# Setup Supabase untuk Kongsi

Migrasi & Edge Function ada di repo tapi **belum pernah dijalankan** ke project
Supabase manapun. Ini langkahnya.

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

Ini bikin: `profiles`, `groups`, `group_members`, `bills`, `bill_months`,
`payments`, RPC `create_group`, bucket storage `proofs`, dan semua RLS policy.

Cek cepat di SQL editor:

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- semua harus rowsecurity = true
```

## 5. Auth settings (dashboard → Authentication)

- **Providers → Email**: aktif. "Confirm email" = ON (biar ada kode OTP).
- **Email Templates → Confirm signup**: pastiin body-nya ngirim
  `{{ .Token }}` (kode 6 digit), bukan cuma `{{ .ConfirmationURL }}` —
  app minta kode manual, bukan link.
- **URL Configuration → Redirect URLs**: tambahin `billsapp://` dan URL dev
  Expo (`exp://` / `http://localhost:8081`).
- (Opsional) matiin "Enable email confirmations" pas dev lokal kalau mau
  skip OTP — tapi flow `verifyEmail` di app mengasumsikan ON.

## 6. Edge Function `read-proof`

Set key Anthropic sebagai **secret** (bukan di `.env` app):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# opsional, default claude-opus-5:
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-5
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
