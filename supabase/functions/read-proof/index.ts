/**
 * read-proof — analyse a transfer-receipt screenshot.
 *
 * Runs on Supabase Edge (Deno). The Anthropic key lives in the function's
 * environment (`supabase secrets set ANTHROPIC_API_KEY=...`) and never reaches
 * the client.
 *
 * Request  (POST, JSON):
 *   { "imageBase64": "<base64 or data: URI>", "mediaType"?: "image/jpeg" }
 * Response (JSON):
 *   {
 *     "amount": number | null,        // rupiah transferred, no separators
 *     "isReceipt": boolean,           // does it look like a bank/e-wallet transfer proof at all
 *     "platform": string | null,      // best guess: "GoPay" | "BCA" | ...
 *     "suspiciousNote": string | null,// short note if the image looks edited / off
 *     "model": string
 *   }
 *   { "amount": null, "isReceipt": false, "refused": true }  // safety refusal
 *   { "error": string }                                      // 4xx / 5xx
 *
 * Model: defaults to `claude-sonnet-5` (narrow task, called often). Override
 * with the `ANTHROPIC_MODEL` secret.
 */

import Anthropic from 'npm:@anthropic-ai/sdk@^0.124.0';

const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5';

const PROMPT = `Kamu memeriksa satu gambar yang diklaim sebagai bukti transfer bank / e-wallet Indonesia.

Jawab HANYA dengan JSON (tanpa teks lain, tanpa markdown) dengan bentuk persis:
{
  "amount": <angka nominal yang DITRANSFER, tanpa titik/koma, atau null kalau tidak jelas>,
  "is_receipt": <true kalau gambar ini SECARA UMUM terlihat seperti tangkapan layar bukti transfer / struk pembayaran bank atau e-wallet (ada nominal, status berhasil, tujuan, dsb), terlepas dari nominalnya kebaca atau tidak; false kalau ini foto/gambar lain (meme, foto orang, screenshot chat biasa, dokumen tak terkait, dll)>,
  "platform": <tebakan sumber bukti: "GoPay" | "OVO" | "DANA" | "ShopeePay" | "LinkAja" | nama bank (mis. "BCA", "Mandiri", "BNI", "BRI") | "Lainnya" | null kalau tidak bisa ditebak>,
  "suspicious_note": <kalimat singkat Bahasa Indonesia kalau ADA tanda visual yang janggal: font tidak konsisten, perataan teks aneh, angka nominal terlihat ditempel/diedit, elemen UI tidak natural, resolusi campur. null kalau tidak ada yang mencurigakan>
}

Fokus "amount" ke nominal yang dikirim, bukan saldo, bukan biaya admin, bukan total tagihan.`;

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

interface Analysis {
  amount: number | null;
  isReceipt: boolean;
  platform: string | null;
  suspiciousNote: string | null;
}

function coerceAmount(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function coerceString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length === 0 || s.toLowerCase() === 'null' ? null : s;
}

function parseAnalysis(text: string): Analysis {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    const p = JSON.parse(clean) as Record<string, unknown>;
    return {
      amount: coerceAmount(p.amount),
      isReceipt: p.is_receipt === true,
      platform: coerceString(p.platform),
      suspiciousNote: coerceString(p.suspicious_note),
    };
  } catch {
    const m = clean.match(/-?\d[\d.,]*/);
    return {
      amount: m ? coerceAmount(m[0].replace(/[.,]/g, '')) : null,
      isReceipt: false,
      platform: null,
      suspiciousNote: null,
    };
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
      max_tokens: 400,
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
      return json({
        amount: null,
        isReceipt: false,
        platform: null,
        suspiciousNote: null,
        refused: true,
        model: resp.model,
      });
    }

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return json({ ...parseAnalysis(text), model: resp.model });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 502);
  }
});
