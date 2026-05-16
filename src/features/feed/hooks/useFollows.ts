import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import type { Language } from '../../../shared/types';

interface UseFollowsResult {
  followingIds: string[];
  currentUserId: string;
  loading: boolean;
  toggleFollow: (targetUserId: string) => void;
}

export const useFollows = (lang: Language = 'bg'): UseFollowsResult => {
  const [currentUserId, setCurrentUserId] = useState('');
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (user) {
          setCurrentUserId(user.id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('useFollows getUser error:', err);
        setLoading(false);
      });
  }, []);

  const loadFollowingIds = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (error) {
      console.error('useFollows load error:', error);
    } else if (data) {
      setFollowingIds(data.map((row) => row.following_id as string));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    loadFollowingIds(currentUserId);
  }, [currentUserId, loadFollowingIds]);

  const follow = useCallback(async (targetUserId: string) => {
    if (!currentUserId || targetUserId === currentUserId) return;

    setFollowingIds((prev) => (prev.includes(targetUserId) ? prev : [...prev, targetUserId]));
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: currentUserId, following_id: targetUserId });

    if (error) {
      console.error('follow error:', error);
      setFollowingIds((prev) => prev.filter((id) => id !== targetUserId));
      toast.error(lang === 'en' ? 'Failed to follow user' : 'Грешка при следване');
    }
  }, [currentUserId, lang]);

  const unfollow = useCallback(async (targetUserId: string) => {
    if (!currentUserId) return;

    setFollowingIds((prev) => prev.filter((id) => id !== targetUserId));
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId);

    if (error) {
      console.error('unfollow error:', error);
      setFollowingIds((prev) => (prev.includes(targetUserId) ? prev : [...prev, targetUserId]));
      toast.error(lang === 'en' ? 'Failed to unfollow user' : 'Грешка при отписване');
    }
  }, [currentUserId, lang]);

  const toggleFollow = useCallback((targetUserId: string) => {
    if (followingIds.includes(targetUserId)) {
      unfollow(targetUserId);
    } else {
      follow(targetUserId);
    }
  }, [followingIds, follow, unfollow]);

  return { followingIds, currentUserId, loading, toggleFollow };
};
