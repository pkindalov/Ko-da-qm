import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export const useFollowerCount = (userId: string) => {
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)
      .then(({ count, error }) => {
        if (error) {
          console.error('useFollowerCount error:', error);
          return;
        }
        setFollowerCount(count ?? 0);
      });
  }, [userId]);

  return followerCount;
};
