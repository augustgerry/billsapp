import { supabase } from '@/lib/supabase';

/** Fire-and-forget: ask the notify-proof function to ping the PJ. */
export async function notifyProofUploaded(payload: {
  groupId: string;
  billId: string;
  month: string;
  member: string;
  amount: number | null;
}): Promise<void> {
  try {
    await supabase.functions.invoke('notify-proof', { body: payload });
  } catch (e) {
    console.warn('[notify] notify-proof failed:', e);
  }
}
