import { useEffect, useRef } from 'react';

import { normalizeEmail } from '@/domain/email';
import { supabase } from '@/lib/supabase';

/**
 * Point 4: watch `group_members` for the signed-in user's own rows so a fresh
 * invite lands on Home without a manual refresh. RLS ("read own rows by email")
 * means Realtime only ever delivers this user's rows.
 */
export function useInvitesRealtime(
  email: string | null | undefined,
  onChange: () => void,
): void {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const mail = email ? normalizeEmail(email) : '';
    if (!mail) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), 400);
    };

    const channel = supabase
      .channel(`invites-${mail}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `email=eq.${mail}`,
        },
        () => bump(),
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [email]);
}
