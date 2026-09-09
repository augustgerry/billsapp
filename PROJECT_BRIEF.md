# Kongsi — Project Brief for Claude Code

## Apa ini
Kongsi adalah app pengelola tagihan rumah tangga bareng (listrik, air, wifi, cicilan, dst) untuk keluarga/orang yang saling kenal. Sudah ada working prototype dalam bentuk single-file HTML/JS (terlampir: `kongsi-pilot.html`) yang jadi acuan logika & alur — tugasnya sekarang PORTING logika itu ke React Native (Expo), BUKAN redesign dari nol. Style/CSS boleh diadaptasi ke komponen native, tapi alur data & aturan bisnis di bawah ini harus dipertahankan persis.

## Tech stack (sudah diputuskan, jangan diganti tanpa didiskusikan dulu)
- **Frontend**: React Native + Expo (SDK 57), target akhir: submit ke App Store & Play Store
- **Backend/DB/Auth**: Supabase (Postgres + Supabase Auth, gantikan sistem OTP simulasi & `window.storage` di prototype)
- **AI (OCR bukti transfer)**: Anthropic API (model vision), dipanggil dari Supabase Edge Function — jangan expose API key di client
- **Repo**: GitHub `augustgerry/billsapp`, branch `main`

## Struktur data inti

### Account (Supabase Auth)
- email, password (dihandle Supabase Auth), nomor WA
- Satu email = satu akun, dipakai lintas grup

### Group
- name, pin (6 digit — dipakai semua anggota buat masuk, bukan per-akun)
- members: array `{ name, email }` — **email tiap anggota wajib diisi**, ini kunci sistem identitas
- bills: array of Bill

### Member identity rule (PENTING)
Saat user login ke sebuah grup, sistem **otomatis cocokkan email akun yang sedang login ke `members[].email`** milik grup itu — user LANGSUNG dikenali sebagai member itu, TIDAK ADA pilihan "kamu siapa?" manual. Kalau email akun tidak match ke member manapun di grup itu, akses ditolak dengan pesan jelas ("email kamu belum terdaftar sebagai anggota grup ini").

### Bill
```
{
  id, name, category,          // category: Listrik | Air | WiFi | Tagihan Rumah | Cicilan | Lainnya
  type,                        // 'single' | 'split'  — HANYA 2 opsi, TIDAK ADA tipe "installment" terpisah
  responsible,                 // nama member: untuk single = penanggung jawab; untuk split = yang menalangi/menerima transfer
  splitMembers,                // array nama member (hanya diisi kalau type='split')
  estimate,                    // nominal per bulan/per cicilan
  dueDay, dueMonth, dueYear,   // tanggal jatuh tempo (dueDay dipakai buat hitung reminder bulanan, month/year buat catatan "mulai berlaku")
  tenor,                       // OPSIONAL — hanya ada kalau category==='Cicilan'. Muncul independen dari `type` (single ATAU split boleh punya tenor)
  paidCount,                   // sudah berapa kali cicilan terbayar (increment logic ada di bawah)
  installmentTotal,            // opsional — kalau user pilih "hitung dari total dibagi tenor", ini simpan total aslinya
  lender                       // opsional — hanya untuk category==='Cicilan', isi nama member lain kalau ini utang ke sesama anggota (bukan cicilan pribadi/toko)
}
```

**Skema Cicilan (unified, ini bagian paling sering disalahpahami — baca pelan-pelan):**
- `tenor` muncul di form HANYA kalau `category === 'Cicilan'`, terlepas dari `type` single/split
- **Cicilan + single**: satu orang nyicil sendiri (bisa utang pribadi atau `lender` = nama anggota lain)
- **Cicilan + split**: beberapa orang patungan bayar cicilan bareng tiap bulan; `paidCount` baru bertambah 1 kalau SEMUA yang wajib bayar bulan itu sudah lunas (bukan per-orang)
- Toggle "hitung dari total dibagi tenor": user input total sekali, sistem hitung `estimate = total / tenor` otomatis
- "Lunasi dipercepat" (bayar sisa sekaligus): saat ini HANYA didukung untuk `type='single'` (scope sengaja dibatasi, split terlalu kompleks buat MVP)
- `isInstallmentDone = tenor && paidCount >= tenor` — begitu true, bill ini sudah tidak butuh pembayaran lagi bulan-bulan berikutnya

### Payment (per bill, per bulan — key: `YYYY-MM`)
```
{
  status,        // 'unpaid' | 'paid' | 'review' | 'awaiting'
  amount,        // nominal yang terbaca dari OCR
  proofImage,    // base64/url bukti transfer
  uploadedAt
}
```

**Alur status pembayaran (INI YANG PALING SERING DIMINTA DIPERBAIKI, jadi harus presisi):**

1. Member yang wajib bayar upload foto bukti transfer
2. Sistem panggil AI (vision) buat baca nominal dari foto
3. **Kalau nominal terbaca COCOK** dengan yang diharapkan → langsung `status='paid'` (untuk single/installment, ini juga trigger `paidCount++` kalau `allPaid` untuk bulan itu — lihat fungsi `maybeAdvanceInstallment` di prototype)
4. **Kalau TIDAK cocok** → `status='review'`
   - Untuk `type='single'`: yang upload (=penanggung jawab) bisa klik "Tandai valid" → langsung jadi `paid` (self-attest, karena dia sendiri yang akuntabel)
   - Untuk `type='split'`: yang upload (bukan PJ) bisa klik "Tandai sudah bayar" → status jadi `awaiting`, BUKAN langsung paid
5. **`status='awaiting'`**: hanya `responsible`/PJ grup itu yang bisa lihat tombol "Konfirmasi lunas" (→paid) atau "Tolak" (→unpaid). Member biasa cuma lihat teks "Menunggu konfirmasi [nama PJ]"

**Siapa yang wajib bayar tiap bulan (`requiredMembers`)**:
- Kalau `isInstallmentDone` → tidak ada yang wajib (kosong)
- `type='single'` → hanya `responsible`
- `type='split'` → semua `splitMembers` KECUALI `responsible` (karena `responsible` yang menalangi ke penyedia jasa duluan, member lain bayar ganti ke dia)

**Permission "Edit nominal"**: hanya `responsible` bill itu yang bisa edit nominal setelah bill dibuat.

## Fitur UI yang harus ada

1. **Auth**: Register (email, password, WA) → OTP (email, untuk sekarang bisa pakai Supabase Auth OTP asli) → login. Enter key submit dari field password. Tombol disable sampai form valid.
2. **Home**: daftar grup yang pernah dibuka ("Lanjutkan") dengan opsi duplikat/hapus dari daftar pribadi (bukan hapus data grup beneran), tombol buat grup baru / join pakai kode.
3. **Buat grup**: nama grup, list anggota (nama+email, minimal 2, bisa tambah/hapus baris), PIN 6 digit.
4. **Login ke grup**: auto-deteksi identitas dari email (lihat "Member identity rule" di atas), lalu input PIN grup — begitu 6 digit benar, langsung masuk tanpa tombol submit terpisah.
5. **Tambah tagihan**: nama, kategori (dengan ikon+warna beda per kategori), tanggal jatuh tempo (bisa DIKETIK manual angka, bukan cuma pilih dari popup), tipe (satu orang/dibagi rata), field tenor kalau kategori Cicilan (lihat skema di atas).
6. **Dashboard grup**: tab segmented "Tagihan" (list bill per bulan, bisa expand per item buat lihat rincian per orang, tiap bill dalam kotak/card sendiri biar kelihatan misah) dan "Ringkasan" (kartu "siapa belum bayar" — JANGAN default nampilin "Lunas" kalau memang belum ada tagihan sama sekali; grafik tren bulanan per kategori; export Excel/PDF; generator teks reminder).
7. **Upload bukti**: lihat alur status di atas. Setelah upload, tampilan JANGAN auto-collapse — biarkan card tetap terbuka nunjukin status terbaru.
8. **Hapus/duplikat grup**: dari halaman "Lanjutkan" di Home saja (bukan dari daftar tagihan).

## Yang belum perlu dikerjakan dulu (scope untuk fase berikutnya)
- Push notification / WhatsApp API asli buat reminder (sekarang cukup generate teks buat di-copy manual)
- "Lunasi dipercepat" untuk cicilan tipe split
- Fitur agentic (insight proaktif, pengingat adaptif) — ini masuk sesudah CRUD dasar & auth solid

## Urutan kerja yang disarankan
1. Setup Supabase: tabel `accounts` (kalau tidak pakai Supabase Auth built-in penuh), `groups`, `bills`, `payments`. Setup RLS policy dasar.
2. Auth flow (register/login) pakai Supabase Auth
3. CRUD grup + member identity matching
4. CRUD bill (termasuk skema Cicilan unified)
5. Upload bukti + panggil Anthropic API dari Edge Function + alur status
6. Dashboard (tab Tagihan + Ringkasan, chart, export)
7. Polish UI mengikuti gaya dark/iOS dari prototype
8. Testing bareng beberapa user asli sebelum submit ke store
