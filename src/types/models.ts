/**
 * Domain model for Kongsi.
 *
 * This is a straight port of the data shapes in `kongsi-pilot.html` (the working
 * prototype). Business rules that operate on these types live in `src/domain/`.
 * The Supabase persistence layer maps these to/from SQL rows — see
 * `docs/ARCHITECTURE.md` and `supabase/migrations/`.
 *
 * Deliberately dependency-free so the domain layer can be unit-tested with
 * `node --test` (type stripping) without pulling in React Native.
 */

// ---------------------------------------------------------------------------
// Accounts & identity
// ---------------------------------------------------------------------------

/**
 * One account per email, reused across every group the person belongs to.
 * Email + password are owned by Supabase Auth; this is the app-side profile.
 */
export interface Account {
  /** Supabase Auth user id (uuid). */
  id: string;
  /** Lowercased. The identity key that gets matched against `Member.email`. */
  email: string;
  /** WhatsApp number, digits only, e.g. "08123456789". */
  wa: string;
  createdAt: number;
}

/**
 * A member slot inside a group. The prototype identifies people purely by
 * `name` inside a group; `email` is the join key to an {@link Account}.
 *
 * Member identity rule (see PROJECT_BRIEF): on login the account email is
 * matched to exactly one `Member.email` in the group — no manual "who are you?"
 * step. No match => access denied.
 */
export interface Member {
  /** Display name, unique within the group. Used as the key everywhere. */
  name: string;
  /** Lowercased email. Required for every member. */
  email: string;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export type MemberName = string;

/** Share/join code, e.g. "7XQP2" (prototype uses 5 chars, no ambiguous glyphs). */
export type GroupCode = string;

export interface Group {
  /** Supabase `groups.id` (uuid). The persistence key; `code` is the human one. */
  id: string;
  code: GroupCode;
  name: string;
  /** 6-digit string. Shared by all members to enter the group (not per-account). */
  pin: string;
  members: Member[];
  bills: Bill[];
  /**
   * Per-month payment ledger: `monthly[YYYY-MM][billId]`. Loaded on demand by
   * the repository layer; `readMonthRecord` treats a missing month as empty.
   */
  monthly: Record<MonthKey, Record<BillId, MonthRecord>>;
  createdAt: number;
}

/** A person's private, reorderable list of groups they've opened ("Lanjutkan"). */
export interface RecentGroup {
  code: GroupCode;
  name: string;
}

// ---------------------------------------------------------------------------
// Bills
// ---------------------------------------------------------------------------

export type BillId = string;

export const BILL_CATEGORIES = [
  'Listrik',
  'Air',
  'WiFi',
  'Tagihan Rumah',
  'Cicilan',
  'Lainnya',
] as const;

export type BillCategory = (typeof BILL_CATEGORIES)[number];

/**
 * Only two responsibility shapes. There is NO separate "installment" type —
 * an installment is any bill whose `category === 'Cicilan'` (which is what makes
 * `tenor` appear on the form). See the "Skema Cicilan (unified)" note in the brief.
 */
export type BillType = 'single' | 'split';

export interface Bill {
  id: BillId;
  name: string;
  category: BillCategory;
  type: BillType;

  /**
   * - `single`: the sole penanggung jawab (PJ).
   * - `split`: the member who fronts the money to the provider and receives the
   *   others' transfers. Always one of `splitMembers`.
   */
  responsible: MemberName;

  /** Populated only when `type === 'split'`. Includes `responsible`. */
  splitMembers: MemberName[];

  /** Nominal per month / per installment (after "total ÷ tenor" is applied). */
  estimate: number;

  /** Day-of-month the bill is due; drives the monthly reminder countdown. */
  dueDay: number;
  /** Month/year the bill "starts applying" — a note, not a recurrence rule. */
  dueMonth: number;
  dueYear: number;

  // --- Cicilan-only fields (present iff category === 'Cicilan') ---------------

  /** Number of installments. Its presence is the "is this an installment?" test. */
  tenor?: number;
  /** How many installments already settled. Advances per-month, not per-person. */
  paidCount?: number;
  /** Original total, kept when the user entered a total and let us divide by tenor. */
  installmentTotal?: number;
  /**
   * Set only when this installment is a debt to another *member* (e.g. "Gerry
   * pinjam ke Kaka"). Empty/undefined = personal or third-party credit. Label only.
   */
  lender?: MemberName;
}

// ---------------------------------------------------------------------------
// Payments (per bill, per month)
// ---------------------------------------------------------------------------

/** Month bucket key, `YYYY-MM`. */
export type MonthKey = string;

/**
 * Payment status for one member on one bill in one month.
 *
 * Flow (see brief — "Alur status pembayaran"):
 *   unpaid
 *     └─ upload proof, OCR matches expected      -> paid
 *     └─ upload proof, OCR mismatch              -> review
 *   review
 *     └─ uploader "Upload ulang"                 -> unpaid (proof dropped, retry)
 *     └─ single: uploader (= PJ) "Tandai valid"  -> paid
 *     └─ split:  uploader "Tandai sudah bayar"   -> awaiting
 *   awaiting  (split only)
 *     └─ PJ "Konfirmasi lunas"                   -> paid
 *     └─ PJ "Tolak"                              -> unpaid (proof dropped)
 *
 * The "Upload ulang" path is an addition to the prototype — see
 * docs/ARCHITECTURE.md open question #3.
 */
export type PaymentStatus = 'unpaid' | 'paid' | 'review' | 'awaiting';

export interface MemberPayment {
  status: PaymentStatus;
  /** Nominal read from the transfer proof by OCR (null if unreadable). */
  amount: number | null;
  /** Data URI or storage URL of the uploaded proof. */
  proofImage: string | null;
  /** Epoch ms of the upload. */
  uploadedAt: number | null;
  /**
   * Whether OCR's reading matched the expected share within tolerance.
   * Kept so the PJ has context when confirming an `awaiting` payment
   * (the prototype referenced this but never persisted it).
   */
  ocrMatched?: boolean;
}

export interface MonthRecord {
  /**
   * Per-month nominal override. `null` => use `Bill.estimate`.
   * Only ever set for non-installment `single` bills (from a clean OCR match or
   * an "Edit nominal" by the responsible member).
   */
  amount: number | null;
  /** Member name -> their payment for this bill this month. */
  payments: Record<MemberName, MemberPayment>;
  /**
   * Idempotency guard for installment advancement. Once the counter has been
   * bumped for this bill in this month, it must not bump again — even if a
   * member re-uploads a proof that re-sets their status to `paid`.
   *
   * NOT in the prototype; added in the port to fix a latent double-increment.
   * See `maybeAdvanceInstallment` and open question #1 in docs/ARCHITECTURE.md.
   */
  installmentAdvanced?: boolean;
}

// ---------------------------------------------------------------------------
// Derived / view-model helpers used by the dashboard
// ---------------------------------------------------------------------------

/** One line in a member's "belum bayar" breakdown. */
export interface OwedLine {
  billName: string;
  amount: number;
}

/** Per-member roll-up for the "Ringkasan" tab. */
export interface MemberSummary {
  name: MemberName;
  /** Total this member is on the hook for this month (their contribution share). */
  contribution: number;
  /** Of that, how much is still unpaid. */
  owed: number;
  owedDetail: OwedLine[];
  /** False when the member has no dues at all this month (=> not "Lunas", "Belum ada tagihan"). */
  hasDues: boolean;
}
