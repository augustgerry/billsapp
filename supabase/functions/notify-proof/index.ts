/**
 * notify-proof — send an Expo push notification to a bill's responsible member
 * after someone uploads a transfer proof.
 *
 * Invoked by the client (with the user's JWT) right after `submitProof`
 * commits. Runs with the service role to look up device tokens across users.
 *
 * Request (POST, JSON):
 *   { groupId, billId, month, member, amount? }
 * Response: { sent: number }
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

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

function formatRp(n: number | null | undefined): string {
  if (!n || n <= 0) return '';
  return 'Rp' + Math.round(n).toLocaleString('id-ID');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body: {
    groupId?: string;
    billId?: string;
    month?: string;
    member?: string;
    amount?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }
  const { groupId, billId, month, member } = body;
  if (!groupId || !billId || !member) {
    return json({ error: 'groupId, billId, member required' }, 400);
  }

  const { data: bill } = await admin
    .from('bills')
    .select('name, responsible, group_id')
    .eq('id', billId)
    .maybeSingle();
  if (!bill || bill.group_id !== groupId) {
    return json({ error: 'bill not found' }, 404);
  }

  // The PJ needs to check the payment. If the PJ is the uploader, nobody to tell.
  const recipient = bill.responsible as string;
  if (!recipient || recipient === member) return json({ sent: 0 });

  const { data: group } = await admin
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .maybeSingle();

  const { data: tokenRows } = await admin.rpc('push_tokens_for_group_member', {
    p_group_id: groupId,
    p_member: recipient,
  });
  const tokens: string[] = (tokenRows ?? []).map((r: { token: string }) => r.token);
  if (tokens.length === 0) return json({ sent: 0 });

  const rp = formatRp(body.amount ?? null);
  const messages = tokens.map((to) => ({
    to,
    title: group?.name ?? 'Kongsi',
    body: `${member} sudah transfer${rp ? ` ${rp}` : ''} untuk "${bill.name}", silakan dicek.`,
    data: { groupId, billId, month },
    channelId: 'default',
    priority: 'high',
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    return json({ error: `expo push ${res.status}: ${await res.text()}` }, 502);
  }

  return json({ sent: tokens.length });
});
