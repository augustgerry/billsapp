# Push notifications — setup

Kode-nya sudah ada dan ter-deploy:

- `src/features/notifications/push.ts` — minta izin + daftar Expo push token
  per akun (tabel `push_tokens`). Dipanggil otomatis dari `AuthProvider` tiap
  ada sesi.
- `src/features/notifications/notify.ts` — panggil edge function `notify-proof`
  setelah upload bukti sukses (fire-and-forget).
- `supabase/functions/notify-proof` — **deployed + ACTIVE**. Pakai service role
  buat cari device token PJ lewat `push_tokens_for_group_member`, kirim ke
  Expo Push API.

## Kenapa belum jalan

`getExpoPushTokenAsync` butuh:
1. **Development Build** (bukan Expo Go — Expo Go SDK 53+ nggak support remote push).
2. **EAS `projectId`** di `app.json` → `extra.eas.projectId`.

Sampai keduanya ada, `registerPushToken` no-op dengan warning di console —
sisa app tetap jalan normal.

## Langkah bikin dev build

```bash
npm i -g eas-cli          # atau: npx eas-cli
eas login
eas init                  # bikin project EAS + isi extra.eas.projectId di app.json
eas build:configure

# build development client (butuh akun Apple / Google buat store build;
# buat internal testing pakai profil "development"):
eas build --profile development --platform android   # APK, paling gampang buat tes
# atau
eas build --profile development --platform ios       # butuh Apple Developer account
```

Install hasil build di HP fisik, lalu:

```bash
npx expo start --dev-client
```

Buka app lewat dev client itu (bukan Expo Go). Login → app minta izin
notifikasi → token ke-upsert ke `push_tokens`.

## Test manual

Setelah 2 user (dev build) join 1 grup, salah satu upload bukti buat tagihan
yang PJ-nya user lain → PJ dapet notif "X sudah transfer Rp Y untuk ...".

Cek token kesimpen:
```sql
select user_id, platform, left(token, 24) || '...' from push_tokens;
```

Kirim manual buat debug:
```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H 'Content-Type: application/json' \
  -d '[{"to":"ExponentPushToken[xxxx]","title":"Tes","body":"halo"}]'
```

## Catatan

- Notif dikirim ke **PJ tagihan** (kecuali PJ = yang upload). "Member lain
  yang relevan" belum di-fan-out — tambahin di `notify-proof` kalau perlu.
- Trigger-nya client-driven (dipanggil habis `submitProof`). Lebih tahan
  banting kalau dipindah ke DB trigger + `pg_net`, tapi cukup buat sekarang.
- Belum ada deep-link dari notif ke layar grup — `data: { groupId }` udah
  dikirim, tinggal handle di `Notifications.addNotificationResponseReceivedListener`.
