/**
 * Email validation, shared by every form that takes an address (sign-in,
 * sign-up, group members). Deliberately stricter than "has an @": the domain
 * must end in a real-looking TLD (2+ letters), so `a@b`, `a@b.`, `a@b.c` and
 * `a@b.123` are all rejected while `a@b.com` and `a@b.co.id` pass.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(value: string | null | undefined): boolean {
  return EMAIL_RE.test((value ?? '').trim());
}

/** Normalised form used as the identity key everywhere: trimmed + lowercased. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
