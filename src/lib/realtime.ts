import { supabase } from './supabase';

let seq = 0;

/**
 * A Realtime channel whose topic is guaranteed unique for this call.
 *
 * `supabase.channel(topic)` returns the *existing* channel when one with the
 * same topic is still registered on the client. `removeChannel()` is async, so
 * a screen that unmounts and remounts quickly — a `<Redirect>` bounce through
 * group-login, tab navigation, Fast Refresh — can hand the new mount a channel
 * that has already `subscribe()`d. Calling `.on('postgres_changes', …)` on it
 * then throws:
 *
 *   cannot add `postgres_changes` callbacks for realtime:… after `subscribe()`.
 *
 * A per-call suffix sidesteps the reuse entirely; the stale channel tears
 * itself down when its own `removeChannel()` settles a tick later.
 */
export function freshChannel(prefix: string) {
  seq += 1;
  return supabase.channel(`${prefix}#${seq}`);
}
