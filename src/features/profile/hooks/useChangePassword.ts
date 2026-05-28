import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import type { Language } from '../../../shared/types';

export const useChangePassword = (lang: Language) => {
  const [isChanging, setIsChanging] = useState(false);
  const isEnglish = lang === 'en';

  const changePassword = async (password: string): Promise<boolean> => {
    setIsChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(isEnglish ? 'Password changed successfully' : 'Паролата е сменена успешно');
      return true;
    } catch {
      toast.error(isEnglish ? 'Failed to change password' : 'Грешка при смяна на паролата');
      return false;
    } finally {
      setIsChanging(false);
    }
  };

  return { changePassword, isChanging };
};
