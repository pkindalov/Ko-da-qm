import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import type { Language } from '../../../shared/types';

interface UseFollowsResult {
  followingIds: string[];
  currentUserId: string;
  loading: boolean;
  toggleFollow: (targetUserId: string) => void;
}

const fetchCurrentUserId = async (): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? '';
  } catch (err) {
    console.error('useFollows getUser error:', err);
    return '';
  }
};

const fetchFollowingIds = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (error) {
    console.error('useFollows load error:', error);
    return [];
  }
  return data?.map(row => row.following_id as string) ?? [];
};

export const useFollows = (lang: Language = 'bg'): UseFollowsResult => {
  const queryClient = useQueryClient();

  const { data: currentUserId = '', isPending: userIdPending } = useQuery<string>({
    queryKey: ['currentUserId'],
    queryFn: fetchCurrentUserId,
  });

  const { data: followingIds = [], isPending: followsPending } = useQuery<string[]>({
    queryKey: ['followingIds', currentUserId],
    queryFn: () => fetchFollowingIds(currentUserId),
    enabled: currentUserId !== '',
  });

  const loading = userIdPending || (currentUserId !== '' && followsPending);

  const followMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId || targetUserId === currentUserId) return;
      const { error } = await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetUserId });
      if (error) throw error;
    },
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ['followingIds', currentUserId] });
      const previous = queryClient.getQueryData<string[]>(['followingIds', currentUserId]);
      queryClient.setQueryData<string[]>(['followingIds', currentUserId], (old = []) =>
        old.includes(targetUserId) ? old : [...old, targetUserId]
      );
      return { previous };
    },
    onError: (_err, _targetUserId, context) => {
      queryClient.setQueryData(['followingIds', currentUserId], context?.previous);
      toast.error(lang === 'en' ? 'Failed to follow user' : 'Грешка при следване');
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) return;
      const { error } = await supabase.from('follows').delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId);
      if (error) throw error;
    },
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ['followingIds', currentUserId] });
      const previous = queryClient.getQueryData<string[]>(['followingIds', currentUserId]);
      queryClient.setQueryData<string[]>(['followingIds', currentUserId], (old = []) =>
        old.filter(id => id !== targetUserId)
      );
      return { previous };
    },
    onError: (_err, _targetUserId, context) => {
      queryClient.setQueryData(['followingIds', currentUserId], context?.previous);
      toast.error(lang === 'en' ? 'Failed to unfollow user' : 'Грешка при отписване');
    },
  });

  const toggleFollow = (targetUserId: string) => {
    // Guard here prevents optimistic updates for disallowed operations
    if (!currentUserId || targetUserId === currentUserId) return;
    if (followingIds.includes(targetUserId)) {
      unfollowMutation.mutate(targetUserId);
    } else {
      followMutation.mutate(targetUserId);
    }
  };

  return { followingIds, currentUserId, loading, toggleFollow };
};
