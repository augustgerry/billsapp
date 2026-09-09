/** Group CRUD + join lookup. All identity/authorisation is enforced by RLS. */

import type { Group, Member } from '@/types/models';
import { supabase } from './supabase';
import { groupFromRows } from './mappers';
import type {
  BillRow,
  GroupMemberRow,
  GroupRow,
  JoinLookupRow,
} from './database.types';

export interface JoinLookup {
  groupId: string;
  name: string;
  /** The caller's member name in this group, or null if their email isn't listed. */
  memberName: string | null;
}

/** Resolve a join code. Throws "Kode grup tidak ditemukan" for an unknown code. */
export async function lookupGroupForJoin(code: string): Promise<JoinLookup> {
  const { data, error } = await supabase.rpc('get_group_for_join', {
    p_code: code.trim(),
  });
  if (error) throw new Error(error.message);
  const row = (data as JoinLookupRow[] | null)?.[0];
  if (!row) throw new Error('Kode grup tidak ditemukan');
  return { groupId: row.group_id, name: row.name, memberName: row.member_name };
}

export interface CreateGroupInput {
  name: string;
  pin: string;
  members: Member[];
}

export async function createGroup(
  input: CreateGroupInput,
): Promise<{ groupId: string; code: string }> {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: input.name.trim(),
    p_pin: input.pin,
    p_members: input.members.map((m) => ({
      name: m.name.trim(),
      email: m.email.trim().toLowerCase(),
    })),
  });
  if (error) throw new Error(error.message);
  const row = data as GroupRow;
  return { groupId: row.id, code: row.code };
}

/** "Duplikat" from Home — new group, same members, no bills. */
export async function duplicateGroup(
  groupId: string,
): Promise<{ groupId: string; code: string }> {
  const { data, error } = await supabase.rpc('duplicate_group', {
    p_group_id: groupId,
  });
  if (error) throw new Error(error.message);
  const row = data as GroupRow;
  return { groupId: row.id, code: row.code };
}

/**
 * group + members + bills. `monthly` is empty — load a month with
 * `loadMonth` / `loadAllMonths` from payments-repository.
 */
export async function fetchGroup(groupId: string): Promise<Group> {
  const [groupRes, membersRes, billsRes] = await Promise.all([
    supabase.from('groups').select('*').eq('id', groupId).single(),
    supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at'),
    supabase
      .from('bills')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at'),
  ]);
  if (groupRes.error) throw new Error(groupRes.error.message);
  if (membersRes.error) throw new Error(membersRes.error.message);
  if (billsRes.error) throw new Error(billsRes.error.message);
  return groupFromRows(
    groupRes.data as GroupRow,
    (membersRes.data ?? []) as GroupMemberRow[],
    (billsRes.data ?? []) as BillRow[],
  );
}

/** Rename / change PIN (admin only — RLS rejects non-creators). */
export async function updateGroupSettings(
  groupId: string,
  patch: { name?: string; pin?: string },
): Promise<void> {
  const { error } = await supabase.from('groups').update(patch).eq('id', groupId);
  if (error) throw new Error(error.message);
}
