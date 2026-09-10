/**
 * App-side aliases over the generated Supabase schema. Import row/insert types
 * from HERE, not from `database.types.ts` — that file is regenerated verbatim
 * by `supabase gen types` and any hand edits are lost.
 *
 * Regenerate with:
 *   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 */

export type { Database, Json } from './database.types';
export type { TablesInsert, TablesUpdate, Tables } from './database.types';

import type { Database } from './database.types';

export type BillRow = Database['public']['Tables']['bills']['Row'];
export type BillMonthRow = Database['public']['Tables']['bill_months']['Row'];
export type GroupRow = Database['public']['Tables']['groups']['Row'];
export type GroupMemberRow = Database['public']['Tables']['group_members']['Row'];
export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type RecentGroupRow = Database['public']['Tables']['recent_groups']['Row'];
export type PushTokenRow = Database['public']['Tables']['push_tokens']['Row'];

export type JoinLookupRow =
  Database['public']['Functions']['get_group_for_join']['Returns'][number];
export type InviteRow =
  Database['public']['Functions']['list_my_invites']['Returns'][number];
