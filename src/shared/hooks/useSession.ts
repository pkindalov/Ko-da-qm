import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export const useSession = (): Session | null | undefined => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (active) setSession(data.session); })
      .catch(() => { if (active) setSession(null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  return session;
};
