/**
 * delete-account — permanently delete the calling user's account.
 *
 * Invoked by the client with the user's JWT (see settings screen). Steps:
 *   1. Resolve the caller from their token.
 *   2. Run `delete_my_account_data()` AS the caller — unwinds group ownership,
 *      memberships and personal rows.
 *   3. `auth.admin.deleteUser` (service role) removes the auth user; the
 *      remaining FK cascades (profiles, push_tokens, recent_groups) mop up.
 *
 * Request:  POST, no body.
 * Response: { ok: true } | { error: string }
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'missing bearer token' }, 401);
  }

  // Caller-scoped client: RPC runs with the user's auth.uid().
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) {
    return json({ error: 'invalid session' }, 401);
  }
  const userId = userData.user.id;

  const { error: rpcErr } = await asUser.rpc('delete_my_account_data');
  if (rpcErr) {
    return json({ error: `cleanup failed: ${rpcErr.message}` }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return json({ error: `auth delete failed: ${delErr.message}` }, 500);
  }

  return json({ ok: true });
});
