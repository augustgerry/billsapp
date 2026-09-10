/**
 * The per-user "Lanjutkan" list on Home. "Hapus dari daftar" only hides the
 * row — it never touches the group itself (matches the prototype).
 */

import { supabase } from './supabase';

export interface RecentGroupItem {
  groupId: string;
  code: string;
  name: string;
  openedAt: number;
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listRecentGroups(): Promise<RecentGroupItem[]> {
  const { data: recents, error } = await supabase
    .from('recent_groups')
    .select('*')
    .eq('hidden', false)
    .order('opened_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  const recentRows = recents ?? [];
  if (recentRows.length === 0) return [];

  const ids = recentRows.map((r) => r.group_id);
  const { data: groups, error: gErr } = await supabase
    .from('groups')
    .select('id, code, name')
    .in('id', ids);
  if (gErr) throw new Error(gErr.message);

  const byId = new Map((groups ?? []).map((g) => [g.id, g]));
  return recentRows.flatMap((r) => {
    const g = byId.get(r.group_id);
    return g
      ? [
          {
            groupId: g.id,
            code: g.code,
            name: g.name,
            openedAt: Date.parse(r.opened_at),
          },
        ]
      : []; // no longer a member — drop silently
  });
}

/** Call after opening a group so it floats to the top of "Lanjutkan". */
export async function touchRecentGroup(groupId: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase.from('recent_groups').upsert(
    {
      user_id: userId,
      group_id: groupId,
      opened_at: new Date().toISOString(),
      hidden: false,
    },
    { onConflict: 'user_id,group_id' },
  );
  if (error) throw new Error(error.message);
}

export async function hideRecentGroup(groupId: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('recent_groups')
    .update({ hidden: true })
    .eq('user_id', userId)
    .eq('group_id', groupId);
  if (error) throw new Error(error.message);
}
