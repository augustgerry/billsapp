/**
 * Transfer-proof images: Storage upload/delete + OCR via the `read-proof`
 * Edge Function. Path convention matches the storage RLS policy:
 *   <group_id>/<bill_id>/<month>/<member>.jpg
 */

import type { BillId, MemberName, MonthKey } from '@/types/models';
import { supabase } from './supabase';

const BUCKET = 'proofs';

export function proofObjectPath(
  groupId: string,
  billId: BillId,
  month: MonthKey,
  member: MemberName,
): string {
  // member names can contain spaces — keep the path segment safe
  const safeMember = encodeURIComponent(member);
  return `${groupId}/${billId}/${month}/${safeMember}.jpg`;
}

export async function uploadProof(
  path: string,
  body: ArrayBuffer | Blob | Uint8Array,
  contentType = 'image/jpeg',
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(error.message);
}

export async function deleteProof(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

/** Short-lived viewable URL for a stored proof. */
export async function signedProofUrl(
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export interface ReadProofResult {
  amount: number | null;
  refused?: boolean;
  model?: string;
}

/** Call the OCR Edge Function. `imageBase64` may be a raw or data: string. */
export async function readProof(
  imageBase64: string,
  mediaType = 'image/jpeg',
): Promise<ReadProofResult> {
  const { data, error } = await supabase.functions.invoke<ReadProofResult>(
    'read-proof',
    { body: { imageBase64, mediaType } },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error('read-proof: respons kosong');
  return data;
}
