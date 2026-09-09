/**
 * Which groups have passed the PIN gate this app session. Purely a UX guard —
 * RLS is what actually protects group data, and the PIN is a shared secret, so
 * this is deliberately in-memory only (cleared on app restart).
 */

const unlocked = new Set<string>();

export function markGroupUnlocked(groupId: string): void {
  unlocked.add(groupId);
}

export function isGroupUnlocked(groupId: string): boolean {
  return unlocked.has(groupId);
}

export function lockAllGroups(): void {
  unlocked.clear();
}
