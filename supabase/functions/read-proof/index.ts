/**
 * read-proof — OCR a transfer receipt and return the transferred nominal.
 *
 * Runs on Supabase Edge (Deno). The Anthropic key lives in the function's
 * environment (`supabase secrets set ANTHROPIC_API_KEY=...`) and is never sent
 * to the client — this replaces the prototype's direct browser call to
 * api.anthropic.com.
 *
 * Request  (POST, JSON):
 *   { "imageBase64": "<base64 or data: URI>", "mediaType"?: "image/jpeg" }
 * Response (JSON):
 *   { "amount": number | null, "model": string }   // amount is rupiah, no separators
 *   { "amount": null, "refused": true }             // safety refusal
 *   { "error": string }                             // 4xx / 5xx
 *
 * Model: defaults to `claude-opus-5` (per the claude-api skill's default).
 * Override with the `ANTHROPIC_MODEL` secret — the prototype used Sonnet, so
 * `claude-sonnet-5` is a reasonable cost trade for this narrow task. See
 * open question #5 in docs/ARCHITECTURE.md.
 */

import Anthropic from 'npm:@anthropic-ai/sdk@^0.124.0';

const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-5';

const PROMPT =
  'Ini screenshot bukti transfer bank / e-wallet Indonesia. Baca nominal yang ' +
  'ditransfer (bukan saldo, bukan biaya admin). Jawab HANYA dalam format JSON ' +
  'tanpa teks lain: {"amount": <angka tanpa titik/koma, atau null jika tidak jelas>}';

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

/** Pull an integer rupiah amount out of the model's reply, tolerating fences. */
function extractAmount(text: string): number | null {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(clean);
    const n = Number(parsed?.amount);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  } catch {
    const m = clean.match(/-?\d[\d.,]*/);
    if (!m) return null;
    const n = Number(m[0].replace(/[.,]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
}

const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
const client = apiKey ? new Anthropic({ apiKey }) : null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!client) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

  let body: { imageBase64?: unknown; mediaType?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const raw = body.imageBase64;
  if (typeof raw !== 'string' || raw.length === 0) {
    return json({ error: 'imageBase64 is required' }, 400);
  }
  const data = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw;
  const mediaType =
    typeof body.mediaType === 'string' && body.mediaType
      ? body.mediaType
      : 'image/jpeg';

  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      output_config: { effort: 'low' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    if (resp.stop_reason === 'refusal') {
      return json({ amount: null, refused: true, model: resp.model });
    }

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return json({ amount: extractAmount(text), model: resp.model });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 502);
  }
});
