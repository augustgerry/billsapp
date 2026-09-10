/**
 * UI string table. `{name}` placeholders are filled by `t(key, { name })`.
 * Domain-generated display strings (bill meta line, badges, dates, reminder
 * text) are localised separately inside `src/domain/*` via a `locale` arg.
 */

type Entry = { id: string; en: string };

export const STRINGS = {
  // --- common ---
  'common.cancel': { id: 'Batal', en: 'Cancel' },
  'common.save': { id: 'Simpan', en: 'Save' },
  'common.done': { id: 'Selesai', en: 'Done' },
  'common.close': { id: 'Tutup', en: 'Close' },
  'common.back': { id: 'Kembali', en: 'Back' },
  'common.retry': { id: 'Coba lagi', en: 'Try again' },
  'common.failed': { id: 'Gagal', en: 'Failed' },
  'common.email': { id: 'Email', en: 'Email' },
  'common.password': { id: 'Password', en: 'Password' },
  'common.emailPlaceholder': { id: 'nama@email.com', en: 'name@email.com' },

  // --- date field ---
  'date.pick': { id: 'Pilih tanggal', en: 'Pick a date' },
  'date.typeHint': { id: 'atau ketik: HH/BB/TTTT', en: 'or type: DD/MM/YYYY' },

  // --- Supabase gate ---
  'gate.title': {
    id: 'Supabase belum dikonfigurasi',
    en: 'Supabase is not configured',
  },
  'gate.body': {
    id: 'Salin .env.example ke .env, isi EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY dari dashboard Supabase, lalu restart npm start.',
    en: 'Copy .env.example to .env, set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY from the Supabase dashboard, then restart npm start.',
  },
  'gate.hint': {
    id: 'Langkah lengkap: docs/SUPABASE_SETUP.md',
    en: 'Full steps: docs/SUPABASE_SETUP.md',
  },

  // --- auth: login ---
  'login.title': { id: 'Masuk', en: 'Sign in' },
  'login.subtitle': {
    id: 'Masuk ke akun Kongsi kamu.',
    en: 'Sign in to your Kongsi account.',
  },
  'login.submit': { id: 'Masuk', en: 'Sign in' },
  'login.noAccount': { id: 'Belum punya akun? ', en: "Don't have an account? " },
  'login.register': { id: 'Daftar', en: 'Sign up' },
  'login.failed': { id: 'Gagal masuk', en: 'Sign in failed' },

  // --- auth: register ---
  'register.title': { id: 'Daftar', en: 'Sign up' },
  'register.subtitle': {
    id: 'Buat akun untuk mulai pakai Kongsi.',
    en: 'Create an account to get started with Kongsi.',
  },
  'register.emailInvalid': {
    id: 'Masukkan email yang valid.',
    en: 'Enter a valid email.',
  },
  'register.passwordHint': { id: 'Minimal 6 karakter', en: 'At least 6 characters' },
  'register.passwordShort': {
    id: 'Password minimal 6 karakter.',
    en: 'Password must be at least 6 characters.',
  },
  'register.phoneLabel': { id: 'Nomor HP', en: 'Phone number' },
  'register.phoneInvalid': { id: 'Nomor HP belum valid.', en: 'That phone number looks off.' },
  'register.submit': { id: 'Daftar', en: 'Sign up' },
  'register.haveAccount': { id: 'Sudah punya akun? ', en: 'Already have an account? ' },
  'register.login': { id: 'Masuk', en: 'Sign in' },
  'register.failed': { id: 'Gagal mendaftar', en: 'Sign up failed' },

  // --- auth: verify ---
  'verify.title': { id: 'Verifikasi email', en: 'Verify email' },
  'verify.subtitle': {
    id: 'Masukkan kode 6 digit yang dikirim ke {email}.',
    en: 'Enter the 6-digit code sent to {email}.',
  },
  'verify.codeLabel': { id: 'Kode OTP', en: 'OTP code' },
  'verify.submit': { id: 'Verifikasi', en: 'Verify' },
  'verify.resend': { id: 'Kirim ulang kode', en: 'Resend code' },
  'verify.changeEmail': { id: 'Ganti email', en: 'Change email' },
  'verify.resent': { id: 'Kode baru sudah dikirim.', en: 'A new code has been sent.' },
  'verify.wrongCode': { id: 'Kode salah, coba lagi.', en: 'Wrong code, try again.' },
  'verify.resendFailed': { id: 'Gagal mengirim ulang.', en: 'Failed to resend.' },
  'verify.emailFallback': { id: 'email kamu', en: 'your email' },

  // --- nav titles ---
  'nav.settings': { id: 'Pengaturan', en: 'Settings' },
  'nav.createGroup': { id: 'Buat grup', en: 'New group' },
  'nav.joinGroup': { id: 'Buka grup', en: 'Open group' },
  'nav.groupLogin': { id: 'Masuk grup', en: 'Enter group' },
  'nav.group': { id: 'Grup', en: 'Group' },
  'nav.addBill': { id: 'Tambah tagihan', en: 'Add bill' },

  // --- home ---
  'home.tagline': {
    id: 'Tagihan rumah, diurus bareng. Jelas siapa bayar apa, siapa belum.',
    en: "Household bills, handled together. Clear on who's paid and who hasn't.",
  },
  'home.invites': { id: 'UNDANGAN', en: 'INVITES' },
  'home.accept': { id: 'Terima', en: 'Accept' },
  'home.decline': { id: 'Tolak', en: 'Decline' },
  'home.continue': { id: 'LANJUTKAN', en: 'CONTINUE' },
  'home.startNew': { id: 'MULAI BARU', en: 'START NEW' },
  'home.createGroup': {
    id: 'Buat grup rumah tangga baru',
    en: 'Create a new household group',
  },
  'home.joinGroup': { id: 'Buka grup dengan kode', en: 'Open a group with a code' },
  'home.loadFailed': {
    id: 'Gagal memuat daftar grup',
    en: 'Failed to load your groups',
  },
  'home.duplicate': { id: 'Duplikat', en: 'Duplicate' },
  'home.removeFromList': { id: 'Hapus dari daftar', en: 'Remove from list' },
  'home.rowMenu': { id: 'Menu untuk {name}', en: 'Menu for {name}' },
  'home.removeTitle': {
    id: 'Hapus {name} dari daftar?',
    en: 'Remove {name} from the list?',
  },
  'home.removeBody': {
    id: 'Grupnya tidak dihapus — hanya hilang dari daftar Lanjutkan di HP ini.',
    en: "The group isn't deleted — it just leaves the Continue list on this phone.",
  },
  'home.duplicateTitle': { id: 'Duplikat grup', en: 'Duplicate group' },
  'home.duplicateBody': {
    id: 'Buat grup baru dengan anggota yang sama, tanpa tagihan. Anggota lain akan diundang ulang.',
    en: 'Creates a new group with the same members and no bills. Everyone else gets re-invited.',
  },
  'home.copySuffix': { id: '{name} (Salinan)', en: '{name} (Copy)' },

  // --- settings ---
  'settings.account': { id: 'AKUN', en: 'ACCOUNT' },
  'settings.phone': { id: 'Nomor HP', en: 'Phone' },
  'settings.appearance': { id: 'TAMPILAN', en: 'APPEARANCE' },
  'settings.themeLight': { id: 'Terang', en: 'Light' },
  'settings.themeDark': { id: 'Gelap', en: 'Dark' },
  'settings.themeSystem': { id: 'Ikuti Sistem', en: 'System' },
  'settings.language': { id: 'BAHASA', en: 'LANGUAGE' },
  'settings.langId': { id: 'Indonesia', en: 'Indonesian' },
  'settings.langEn': { id: 'English', en: 'English' },
  'settings.signOut': { id: 'Keluar', en: 'Sign out' },

  // --- create group ---
  'create.subtitle': {
    id: 'Untuk pasangan atau keluarga yang mengatur tagihan bersama.',
    en: 'For couples or families who split the household bills.',
  },
  'create.groupName': { id: 'Nama grup', en: 'Group name' },
  'create.groupNamePlaceholder': { id: 'Contoh: Rumah Kita', en: 'e.g. Our Home' },
  'create.membersLabel': {
    id: 'Anggota (min. 2) — nama & email dipakai untuk login otomatis',
    en: 'Members (min. 2) — name & email are used for auto sign-in',
  },
  'create.memberName': { id: 'Nama anggota', en: 'Member name' },
  'create.memberEmail': { id: 'Email anggota', en: 'Member email' },
  'create.addMember': { id: '+ Tambah anggota', en: '+ Add member' },
  'create.pinLabel': {
    id: 'PIN grup (6 digit, dipakai semua anggota untuk masuk)',
    en: 'Group PIN (6 digits, used by everyone to enter)',
  },
  'create.needSelf': {
    id: 'Email kamu harus termasuk salah satu anggota.',
    en: 'Your email must be one of the members.',
  },
  'create.submit': { id: 'Buat grup', en: 'Create group' },
  'create.failed': { id: 'Gagal membuat grup', en: 'Failed to create the group' },

  // --- join group ---
  'join.subtitle': {
    id: 'Masukkan kode grup yang dibagikan admin.',
    en: 'Enter the group code shared by the admin.',
  },
  'join.codeLabel': { id: 'Kode grup', en: 'Group code' },
  'join.codePlaceholder': { id: 'Contoh: 7XQP2', en: 'e.g. 7XQP2' },
  'join.notMember': {
    id: 'Email kamu ({email}) belum terdaftar sebagai anggota grup {name}. Minta admin untuk menambahkan email kamu.',
    en: 'Your email ({email}) is not listed as a member of {name}. Ask the admin to add your email.',
  },
  'join.invited': {
    id: 'Kamu diundang ke grup {name} sebagai {member}. Terima undangannya untuk gabung.',
    en: 'You were invited to {name} as {member}. Accept the invite to join.',
  },
  'join.acceptContinue': { id: 'Terima & lanjut', en: 'Accept & continue' },
  'join.open': { id: 'Buka grup', en: 'Open group' },
  'join.notFound': { id: 'Kode tidak ditemukan', en: 'Code not found' },
  'join.acceptFailed': {
    id: 'Gagal menerima undangan',
    en: 'Failed to accept the invite',
  },

  // --- group login ---
  'groupLogin.loadError': {
    id: 'Nggak bisa buka grup ini. Kalau kamu baru diundang, terima dulu undangannya di Home.',
    en: "Can't open this group. If you were just invited, accept the invite on Home first.",
  },
  'groupLogin.pendingInvite': {
    id: 'Kamu diundang ke grup ini tapi belum menerima undangannya. Buka Home lalu terima undangannya.',
    en: "You were invited to this group but haven't accepted yet. Go to Home and accept the invite.",
  },
  'groupLogin.notMember': {
    id: 'Email kamu ({email}) belum terdaftar sebagai anggota grup ini. Minta admin untuk menambahkan email kamu.',
    en: 'Your email ({email}) is not a member of this group. Ask the admin to add your email.',
  },
  'groupLogin.title': { id: 'Masuk ke {name}', en: 'Enter {name}' },
  'groupLogin.as': {
    id: 'Masuk sebagai {name}. Masukkan PIN grup.',
    en: 'Signing in as {name}. Enter the group PIN.',
  },
  'groupLogin.pinLabel': { id: 'PIN grup', en: 'Group PIN' },
  'groupLogin.pinWrong': { id: 'PIN salah, coba lagi.', en: 'Wrong PIN, try again.' },
  'groupLogin.loadFailed': { id: 'Gagal memuat grup', en: 'Failed to load the group' },

  // --- dashboard ---
  'dash.waiting': { id: '{n} menunggu', en: '{n} pending' },
  'dash.tabBills': { id: 'Tagihan', en: 'Bills' },
  'dash.tabSummary': { id: 'Ringkasan', en: 'Summary' },
  'dash.mySpend': { id: 'Pengeluaran saya', en: 'My spending' },
  'dash.total': { id: 'Total {month}', en: 'Total {month}' },
  'dash.noBills': {
    id: 'Belum ada tagihan. Tambahkan tagihan pertama.',
    en: 'No bills yet. Add your first one.',
  },
  'dash.addBill': { id: '+ Tambah tagihan baru', en: '+ Add a new bill' },
  'dash.backHome': { id: 'Kembali ke Home', en: 'Back to Home' },
  'dash.trendTitle': { id: 'Tren pengeluaran bulanan', en: 'Monthly spending trend' },
  'dash.exportCsv': { id: 'Export CSV', en: 'Export CSV' },
  'dash.exportPdf': { id: 'Export PDF', en: 'Export PDF' },
  'dash.exportFailed': { id: 'Gagal export', en: 'Export failed' },
  'dash.reminderTitle': { id: 'Pengingat', en: 'Reminder' },
  'dash.copyReminder': { id: 'Salin teks pengingat', en: 'Copy reminder text' },
  'dash.copied': { id: 'Tersalin', en: 'Copied' },
  'dash.copiedBody': {
    id: 'Teks pengingat sudah disalin.',
    en: 'Reminder text copied to clipboard.',
  },
  'dash.notReceiptTitle': { id: 'Bukan bukti transfer', en: 'Not a transfer receipt' },
  'dash.notReceiptBody': {
    id: 'Gambar yang diupload tidak terlihat seperti bukti transfer bank / e-wallet. Konfirmasi langsung ke yang bayar sebelum ditandai lunas.',
    en: "The uploaded image doesn't look like a bank / e-wallet transfer receipt. Confirm directly with the payer before marking it paid.",
  },
  'dash.suspiciousTitle': { id: 'Perlu dicek teliti', en: 'Check carefully' },
  'dash.reviewTitle': { id: 'Perlu dicek', en: 'Needs a check' },
  'dash.reviewBody': {
    id: 'Nominal di bukti tidak terbaca atau berbeda dari yang diharapkan. Periksa dulu, lalu tandai lunas kalau memang sudah benar.',
    en: "The amount couldn't be read, or it differs from what's expected. Check it, then mark it paid if it's correct.",
  },
  'dash.amountDiffTitle': { id: 'Nominal beda', en: 'Amount mismatch' },
  'dash.amountDiffBody': {
    id: 'Nominal di bukti belum cocok dengan sisa cicilan. Coba lagi.',
    en: "The amount doesn't match the remaining installments. Try again.",
  },
  'dash.summaryTodo': {
    id: 'Tab Ringkasan belum dibuat.',
    en: 'Summary tab not built yet.',
  },

  // --- add bill ---
  'bill.recurringNote': {
    id: 'Tagihan ini muncul otomatis tiap bulan.',
    en: 'This bill shows up automatically every month.',
  },
  'bill.nameLabel': { id: 'Nama tagihan', en: 'Bill name' },
  'bill.namePlaceholder': {
    id: 'Contoh: Listrik, Internet, Cicilan Motor',
    en: 'e.g. Electricity, Internet, Motorbike loan',
  },
  'bill.categoryLabel': { id: 'Kategori', en: 'Category' },
  'bill.installmentFor': { id: 'Cicilan ini untuk', en: 'This installment is for' },
  'bill.forSelf': { id: 'Diri sendiri', en: 'Myself' },
  'bill.loanFrom': { id: 'Pinjaman dari {name}', en: 'Loan from {name}' },
  'bill.tenorLabel': { id: 'Tenor (berapa kali)', en: 'Tenor (how many times)' },
  'bill.paidCountLabel': { id: 'Sudah dibayar', en: 'Already paid' },
  'bill.paidCountHint': { id: '0 kalau baru mulai', en: '0 if just starting' },
  'bill.totalModeToggle': {
    id: 'Hitung dari total keseluruhan ÷ tenor',
    en: 'Calculate from the grand total ÷ tenor',
  },
  'bill.dueLabel': { id: 'Jatuh tempo', en: 'Due date' },
  'bill.day': { id: 'Tgl', en: 'Day' },
  'bill.month': { id: 'Bulan', en: 'Month' },
  'bill.year': { id: 'Thn', en: 'Year' },
  'bill.typeLabel': { id: 'Tipe tanggung jawab', en: 'Responsibility type' },
  'bill.typeSingle': { id: 'Satu orang', en: 'One person' },
  'bill.typeSplit': { id: 'Dibagi rata', en: 'Split evenly' },
  'bill.responsibleLabel': { id: 'Penanggung jawab', en: 'Responsible member' },
  'bill.splitLabel': {
    id: 'Siapa saja yang ikut menanggung (min. 2)',
    en: 'Who shares this bill (min. 2)',
  },
  'bill.payerLabel': {
    id: 'Transfer ke siapa (yang menalangi duluan)',
    en: 'Transfer to whom (who fronts the money)',
  },
  'bill.amountTotal': { id: 'Total tagihan keseluruhan', en: 'Grand total' },
  'bill.amountPerInstallment': { id: 'Nominal per cicilan', en: 'Amount per installment' },
  'bill.amountEstimate': { id: 'Perkiraan nominal', en: 'Estimated amount' },
  'bill.perMonthPreview': {
    id: '≈ {amount} per bulan × {n}',
    en: '≈ {amount} per month × {n}',
  },
  'bill.submit': { id: 'Simpan tagihan', en: 'Save bill' },
  'bill.saveFailed': { id: 'Gagal menyimpan tagihan', en: 'Failed to save the bill' },
  'bill.invitedTag': { id: 'diundang', en: 'invited' },

  // --- bill card ---
  'card.paid': { id: 'Lunas', en: 'Paid' },
  'card.unpaid': { id: 'Belum bayar', en: 'Unpaid' },
  'card.review': { id: 'Perlu dicek', en: 'Needs a check' },
  'card.awaitingFor': {
    id: 'Menunggu konfirmasi {name}',
    en: 'Waiting for {name} to confirm',
  },
  'card.awaitingYou': { id: 'Perlu kamu konfirmasi', en: 'Waiting on you to confirm' },
  'card.uploadProof': { id: 'Upload bukti', en: 'Upload proof' },
  'card.reupload': { id: 'Upload ulang', en: 'Re-upload' },
  'card.markPaidSplit': { id: 'Tandai sudah bayar', en: "Mark I've paid" },
  'card.markValid': { id: 'Tandai valid', en: 'Mark valid' },
  'card.confirm': { id: 'Konfirmasi', en: 'Confirm' },
  'card.reject': { id: 'Tolak', en: 'Reject' },
  'card.viewProof': { id: 'Lihat bukti', en: 'View proof' },
  'card.hideProof': { id: 'Sembunyikan bukti', en: 'Hide proof' },
  'card.uploadedAt': { id: 'Diupload {when}', en: 'Uploaded {when}' },
  'card.ocrRead': { id: ' · terbaca {amount}', en: ' · read {amount}' },
  'card.ocrDiff': { id: ' (beda)', en: ' (differs)' },
  'card.notReceipt': {
    id: '⚠️ Gambar ini tidak terlihat seperti bukti transfer — cek langsung ke yang bayar.',
    en: "⚠️ This image doesn't look like a transfer receipt — check directly with the payer.",
  },
  'card.installmentDone': {
    id: 'Semua cicilan sudah lunas.',
    en: 'All installments are paid.',
  },
  'card.fronts': {
    id: '{name} menalangi ke penyedia · {amount}',
    en: '{name} fronts the money to the provider · {amount}',
  },
  'card.payoffRow': {
    id: 'Lunasi sisa {n}x sekaligus',
    en: 'Pay off the remaining {n}× at once',
  },
  'card.payoffUpload': {
    id: 'Upload bukti pelunasan',
    en: 'Upload payoff proof',
  },
  'card.editNominal': { id: 'Edit nominal', en: 'Edit amount' },
  'card.newNominal': { id: 'Nominal baru', en: 'New amount' },

  // --- summary: owed card ---
  'owed.title': { id: 'Siapa belum bayar', en: "Who hasn't paid" },
  'owed.noDues': { id: 'Belum ada tagihan', en: 'No dues yet' },
  'owed.settled': { id: '✓ Lunas', en: '✓ Settled' },
  'owed.unpaidAmount': { id: 'Belum bayar {amount}', en: 'Owes {amount}' },

  // --- summary: trend chart ---
  'trend.empty': {
    id: 'Grafik muncul setelah ada data dari 2 bulan atau lebih.',
    en: 'The chart appears once there is data for 2+ months.',
  },

  // --- phone picker ---
  'phone.pickCountry': { id: 'Pilih negara', en: 'Select country' },
  'phone.searchCountry': { id: 'Cari negara / kode', en: 'Search country / code' },

  // --- proof image picker ---
  'proof.pickTitle': { id: 'Bukti transfer', en: 'Transfer proof' },
  'proof.pickBody': { id: 'Ambil dari mana?', en: 'Where from?' },
  'proof.camera': { id: 'Kamera', en: 'Camera' },
  'proof.gallery': { id: 'Galeri', en: 'Gallery' },
  'proof.cameraDeniedTitle': {
    id: 'Izin kamera ditolak',
    en: 'Camera permission denied',
  },
  'proof.cameraDeniedBody': {
    id: 'Aktifkan izin kamera di Pengaturan.',
    en: 'Enable camera access in Settings.',
  },

  // --- generic export ---
  'export.noData': {
    id: 'Belum ada data untuk diekspor.',
    en: 'Nothing to export yet.',
  },
} satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;
