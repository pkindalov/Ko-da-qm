import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';

export const useForgotPassword = () => {
  const [isSending, setIsSending] = useState(false);

  const sendResetEmail = async (email: string): Promise<boolean> => {
    setIsSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return true;
    } catch {
      toast.error('Грешка при изпращане на имейл');
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return { sendResetEmail, isSending };
};
