/**
 * Live title-casing for name fields — capitalise the first letter of each
 * word as the user types, without touching the rest. Ported from the
 * prototype's `toTitleCase`.
 */
export function toTitleCase(input: string): string {
  return input
    .split(' ')
    .map((word) => (word.length ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}
