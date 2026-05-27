import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import type { Language } from '../../../shared/types';

export const useDeleteAccount = (lang: Language) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const isEnglish = lang === 'en';

  const deleteAccount = async (): Promise<void> => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await supabase.auth.signOut();
    } catch {
      toast.error(isEnglish ? 'Failed to delete account' : 'Грешка при изтриване на профила');
      setIsDeleting(false);
    }
  };

  return { deleteAccount, isDeleting };
};
