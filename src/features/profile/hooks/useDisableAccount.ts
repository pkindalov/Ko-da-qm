import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import type { Language } from '../../../shared/types';

export const useDisableAccount = (lang: Language) => {
  const [isDisabling, setIsDisabling] = useState(false);
  const isEnglish = lang === 'en';

  const disableAccount = async (): Promise<void> => {
    setIsDisabling(true);
    try {
      const { error } = await supabase.rpc('disable_user');
      if (error) throw error;
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch {
      toast.error(isEnglish ? 'Failed to disable account' : 'Грешка при деактивиране на профила');
    } finally {
      setIsDisabling(false);
    }
  };

  return { disableAccount, isDisabling };
};
