import { useEffect, useRef } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Subscribe to payment-ledger changes for one group and call `onChange`
 * (debounced) when a relevant row moves.
 *
 * `payments` / `bill_months` have no group_id column, so those are filtered
 * client-side against `billIds`; `bills` is filtered server-side by group_id.
 * RLS already limits what the client receives to its own groups.
 */
export function useGroupRealtime(
  groupId: string,
  billIds: string[],
  onChange: () => void,
): void {
  const billIdSet = useRef<Set<string>>(new Set());
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    billIdSet.current = new Set(billIds);
  }, [billIds]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!groupId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), 400);
    };
    const touchesGroup = (row: unknown): boolean => {
      if (!row || typeof row !== 'object') return false;
      const r = row as { group_id?: string; bill_id?: string };
      return r.group_id === groupId || billIdSet.current.has(r.bill_id ?? '');
    };

    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (p) => {
          if (touchesGroup(p.new) || touchesGroup(p.old)) bump();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bill_months' },
        (p) => {
          if (touchesGroup(p.new) || touchesGroup(p.old)) bump();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills',
          filter: `group_id=eq.${groupId}`,
        },
        () => bump(),
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [groupId]);
}
