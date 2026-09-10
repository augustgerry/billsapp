/**
 * Privacy Policy & Terms of Service — plain-text drafts shown on the in-app
 * Legal screen and linked from Settings. Bilingual (id / en), kept in sync.
 *
 * NOTE: `CONTACT_EMAIL` is a placeholder — swap it for a monitored address
 * before submitting to the App Store / Play Store, and host the same text at a
 * public URL if the store listing needs an external link.
 *
 * These are drafts, not legal advice. Have them reviewed before launch.
 */

import type { Lang } from '@/features/settings/locale';

export type LegalDoc = 'privacy' | 'terms';

export const CONTACT_EMAIL = 'support@kongsi.app';
export const EFFECTIVE_DATE = '2026-09-11';

interface Section {
  heading: string;
  body: string;
}
interface Doc {
  title: string;
  effective: string;
  sections: Section[];
}

const ID: Record<LegalDoc, Doc> = {
  privacy: {
    title: 'Kebijakan Privasi',
    effective: `Berlaku sejak 11 September 2026`,
    sections: [
      {
        heading: '1. Tentang Kongsi',
        body: `Kongsi adalah aplikasi untuk mencatat dan membagi tagihan rumah tangga bersama (patungan). Kebijakan ini menjelaskan data apa yang kami kumpulkan, untuk apa, dan hak kamu atas data tersebut. Pertanyaan: ${CONTACT_EMAIL}.`,
      },
      {
        heading: '2. Data yang kami kumpulkan',
        body: `• Akun: alamat email dan nomor HP (lengkap dengan kode negara).
• Foto bukti transfer yang kamu unggah.
• Data grup & tagihan: nama grup, nama anggota, email anggota, nama tagihan, kategori, nominal, tanggal jatuh tempo, status pembayaran, dan catatan terkait.
• Token perangkat untuk notifikasi push (jika kamu mengizinkan notifikasi).
• Preferensi aplikasi (tema, bahasa) — disimpan hanya di perangkat kamu.`,
      },
      {
        heading: '3. Cara kami memakai data',
        body: `• Mengautentikasi kamu dan menjaga sesi login.
• Menjalankan fitur inti: membuat grup, menambah tagihan, menghitung bagian tiap orang, melacak pembayaran.
• Menganalisis foto bukti transfer secara otomatis (OCR) untuk membaca nominal dan mengecek kewajaran gambar.
• Mengirim notifikasi ke penanggung jawab tagihan saat ada bukti transfer baru.`,
      },
      {
        heading: '4. Pihak ketiga yang memproses data',
        body: `• Supabase — hosting, basis data, autentikasi, dan penyimpanan file. Server berada di wilayah Singapura (ap-southeast-1). Foto bukti disimpan di bucket privat.
• Anthropic — foto bukti transfer dikirim ke Anthropic API untuk analisis OCR. Sesuai kebijakan Anthropic, masukan API tidak dipakai untuk melatih model.
• Layanan push Expo — token perangkat dan isi notifikasi diteruskan untuk mengirim notifikasi.
Kami tidak menjual data kamu ke siapa pun.`,
      },
      {
        heading: '5. Penyimpanan & retensi',
        body: `Data disimpan selama akun kamu aktif. Foto bukti dan data tagihan bertahan sampai kamu menghapus tagihan tersebut, keluar dari grup, atau menghapus akun. Setelah dihapus, data hilang dari sistem produksi; salinan cadangan terenkripsi bisa bertahan sebentar sebelum ikut terhapus.`,
      },
      {
        heading: '6. Hak kamu',
        body: `• Akses & koreksi: sebagian besar data bisa kamu lihat dan ubah langsung di aplikasi.
• Hapus akun: menu "Hapus Akun" di Pengaturan menghapus akun autentikasi dan data pribadi kamu (profil, nomor HP, token perangkat, daftar grup terakhir). Grup yang masih beranggotakan orang lain tetap ada, tetapi keanggotaan kamu dihapus. Grup yang tidak punya anggota aktif lain akan ikut terhapus beserta tagihannya.
• Kamu bisa meminta salinan data atau mengajukan keberatan lewat ${CONTACT_EMAIL}.`,
      },
      {
        heading: '7. Keamanan',
        body: `Koneksi ke server dienkripsi (HTTPS/TLS). Akses baris data dibatasi lewat Row Level Security sehingga kamu hanya bisa membaca grup tempat kamu menjadi anggota. Meski begitu, tidak ada sistem yang 100% aman — jaga kerahasiaan PIN dan kredensial kamu.`,
      },
      {
        heading: '8. Anak-anak',
        body: `Kongsi tidak ditujukan untuk anak di bawah 17 tahun. Kami tidak sengaja mengumpulkan data dari anak-anak.`,
      },
      {
        heading: '9. Perubahan kebijakan',
        body: `Kami dapat memperbarui kebijakan ini. Perubahan penting akan diberitahukan di dalam aplikasi. Tanggal "berlaku sejak" di atas menandai versi terbaru.`,
      },
    ],
  },
  terms: {
    title: 'Syarat & Ketentuan',
    effective: `Berlaku sejak 11 September 2026`,
    sections: [
      {
        heading: '1. Penerimaan',
        body: `Dengan memakai Kongsi, kamu setuju dengan Syarat & Ketentuan ini dan Kebijakan Privasi. Kalau tidak setuju, jangan memakai aplikasi.`,
      },
      {
        heading: '2. Apa itu Kongsi',
        body: `Kongsi adalah alat bantu untuk mencatat dan membagi tagihan rumah tangga bersama. Kongsi BUKAN penyedia jasa pembayaran dan tidak memindahkan uang. Semua transfer dana terjadi di luar aplikasi lewat bank / e-wallet kamu sendiri.`,
      },
      {
        heading: '3. Akun kamu',
        body: `Kamu bertanggung jawab menjaga kerahasiaan kredensial dan PIN grup, serta atas semua aktivitas di akun kamu. Berikan informasi yang benar saat mendaftar. Satu akun untuk satu orang.`,
      },
      {
        heading: '4. Penggunaan yang dilarang',
        body: `Dilarang memakai Kongsi untuk penipuan, mengunggah bukti transfer palsu atau hasil rekayasa, mengunggah data atau foto orang lain tanpa izin, atau melanggar hukum yang berlaku. Kami dapat menangguhkan akun yang menyalahgunakan layanan.`,
      },
      {
        heading: '5. Konten kamu',
        body: `Kamu tetap pemilik data dan foto yang kamu unggah. Kamu memberi kami izin untuk menyimpan dan memproses konten tersebut semata-mata untuk menjalankan layanan — termasuk mengirim foto bukti ke penyedia OCR untuk dibaca otomatis. Dalam sebuah grup, data tagihan terlihat oleh anggota grup lain.`,
      },
      {
        heading: '6. Akurasi & keputusan',
        body: `Hasil pembacaan otomatis (OCR), perhitungan bagian, dan pengingat disediakan apa adanya dan bisa keliru. Selalu verifikasi nominal dan status pembayaran secara mandiri. Kongsi tidak bertanggung jawab atas perselisihan antar-anggota, kesalahan pembacaan, atau pembayaran yang terlewat.`,
      },
      {
        heading: '7. Penafian & batas tanggung jawab',
        body: `Layanan disediakan "sebagaimana adanya" tanpa jaminan apa pun. Sejauh diizinkan hukum, Kongsi tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan aplikasi.`,
      },
      {
        heading: '8. Penghentian',
        body: `Kamu bisa berhenti dan menghapus akun kapan saja lewat Pengaturan. Kami dapat membatasi atau menghentikan akses jika kamu melanggar ketentuan ini.`,
      },
      {
        heading: '9. Hukum yang berlaku',
        body: `Syarat ini tunduk pada hukum Republik Indonesia.`,
      },
      {
        heading: '10. Perubahan & kontak',
        body: `Kami dapat memperbarui ketentuan ini; perubahan penting diberitahukan di dalam aplikasi. Pertanyaan: ${CONTACT_EMAIL}.`,
      },
    ],
  },
};

const EN: Record<LegalDoc, Doc> = {
  privacy: {
    title: 'Privacy Policy',
    effective: `Effective 11 September 2026`,
    sections: [
      {
        heading: '1. About Kongsi',
        body: `Kongsi is an app for tracking and splitting shared household bills. This policy explains what data we collect, why, and your rights over it. Questions: ${CONTACT_EMAIL}.`,
      },
      {
        heading: '2. Data we collect',
        body: `• Account: email address and phone number (with country code).
• Transfer-receipt photos you upload.
• Group & bill data: group name, member names, member emails, bill names, categories, amounts, due dates, payment status, and related notes.
• A device token for push notifications (if you allow notifications).
• App preferences (theme, language) — stored only on your device.`,
      },
      {
        heading: '3. How we use data',
        body: `• To authenticate you and keep you signed in.
• To run core features: creating groups, adding bills, computing each person's share, tracking payments.
• To analyse receipt photos automatically (OCR) to read the amount and flag images that look off.
• To notify the person responsible for a bill when a new receipt is uploaded.`,
      },
      {
        heading: '4. Third parties that process data',
        body: `• Supabase — hosting, database, authentication and file storage. Servers are in the Singapore region (ap-southeast-1). Receipt photos are kept in a private bucket.
• Anthropic — receipt photos are sent to the Anthropic API for OCR analysis. Per Anthropic's policy, API inputs are not used to train models.
• Expo push service — the device token and notification text are passed through to deliver notifications.
We do not sell your data to anyone.`,
      },
      {
        heading: '5. Storage & retention',
        body: `Data is kept while your account is active. Receipt photos and bill data persist until you delete the bill, leave the group, or delete your account. After deletion, data is removed from production systems; encrypted backups may persist briefly before they are purged too.`,
      },
      {
        heading: '6. Your rights',
        body: `• Access & correction: most data is visible and editable directly in the app.
• Account deletion: "Delete account" in Settings removes your auth account and personal data (profile, phone number, device token, recent-groups list). Groups that still have other members remain, but your membership is removed. A group with no other active members is deleted along with its bills.
• You can request a copy of your data or object to processing via ${CONTACT_EMAIL}.`,
      },
      {
        heading: '7. Security',
        body: `Connections to our servers are encrypted (HTTPS/TLS). Row-level security limits data access so you can only read groups you belong to. No system is perfectly secure, so keep your PIN and credentials private.`,
      },
      {
        heading: '8. Children',
        body: `Kongsi is not directed at anyone under 17. We do not knowingly collect data from children.`,
      },
      {
        heading: '9. Changes to this policy',
        body: `We may update this policy. Material changes will be announced in the app. The "effective" date above marks the current version.`,
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    effective: `Effective 11 September 2026`,
    sections: [
      {
        heading: '1. Acceptance',
        body: `By using Kongsi you agree to these Terms of Service and the Privacy Policy. If you do not agree, do not use the app.`,
      },
      {
        heading: '2. What Kongsi is',
        body: `Kongsi is a tool for recording and splitting shared household bills. Kongsi is NOT a payment provider and does not move money. All fund transfers happen outside the app through your own bank or e-wallet.`,
      },
      {
        heading: '3. Your account',
        body: `You are responsible for keeping your credentials and group PINs confidential, and for all activity under your account. Provide accurate information when you register. One account per person.`,
      },
      {
        heading: '4. Prohibited use',
        body: `Do not use Kongsi for fraud, to upload fake or altered receipts, to upload other people's data or photos without consent, or in violation of applicable law. We may suspend accounts that abuse the service.`,
      },
      {
        heading: '5. Your content',
        body: `You keep ownership of the data and photos you upload. You grant us permission to store and process that content solely to operate the service — including sending receipt photos to an OCR provider for automated reading. Within a group, bill data is visible to the other group members.`,
      },
      {
        heading: '6. Accuracy & decisions',
        body: `Automated reading (OCR), share calculations and reminders are provided as-is and can be wrong. Always verify amounts and payment status yourself. Kongsi is not responsible for disputes between members, misreads, or missed payments.`,
      },
      {
        heading: '7. Disclaimers & limitation of liability',
        body: `The service is provided "as is" without warranties of any kind. To the extent permitted by law, Kongsi is not liable for indirect, incidental or consequential damages arising from your use of the app.`,
      },
      {
        heading: '8. Termination',
        body: `You may stop using Kongsi and delete your account at any time from Settings. We may limit or end access if you breach these terms.`,
      },
      {
        heading: '9. Governing law',
        body: `These terms are governed by the laws of the Republic of Indonesia.`,
      },
      {
        heading: '10. Changes & contact',
        body: `We may update these terms; material changes will be announced in the app. Questions: ${CONTACT_EMAIL}.`,
      },
    ],
  },
};

export function legalDoc(lang: Lang, doc: LegalDoc): Doc {
  return (lang === 'en' ? EN : ID)[doc];
}
