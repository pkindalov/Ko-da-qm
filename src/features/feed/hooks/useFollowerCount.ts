import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

const fetchFollowerCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('follows')
    .select('follower_id', { count: 'exact', head: true })
    .eq('following_id', userId);

  if (error) {
    console.error('useFollowerCount error:', error);
    return 0;
  }
  return count ?? 0;
};

export const useFollowerCount = (userId: string) => {
  const { data: followerCount = 0 } = useQuery<number>({
    queryKey: ['followerCount', userId],
    queryFn: () => fetchFollowerCount(userId),
    enabled: userId !== '',
  });

  return followerCount;
};
