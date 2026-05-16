import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import type { Notification, Language } from '../../../shared/types';

const NOTIFICATION_FETCH_LIMIT = 20;

const mapRow = (row: Record<string, unknown>): Notification => ({
  id: row.id as string,
  actorId: row.actor_id as string | null,
  type: row.type as Notification['type'],
  entityId: row.entity_id as string | null,
  entityType: row.entity_type as string | null,
  isRead: row.is_read as boolean,
  createdAt: row.created_at as string,
  actorName: (row.actor as { name: string } | null)?.name ?? null,
});

export const useNotifications = (lang: Language) => {
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const [userId, setUserId] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    }).catch((err) => console.error('getUser error:', err));
  }, []);

  const loadNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, actor_id, type, entity_id, entity_type, is_read, created_at, actor:users!actor_id(name)')
      .order('created_at', { ascending: false })
      .limit(NOTIFICATION_FETCH_LIMIT);

    if (error) { console.error('loadNotifications error:', error); return; }
    if (!data) return;

    setNotifications(data.map(row => mapRow(row as unknown as Record<string, unknown>)));
  }, []);

  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        () => {
          loadNotifications();
          toast(langRef.current === 'en' ? 'You have a new notification' : 'Имате ново известие');
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, loadNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) {
      console.error('markAsRead error:', error);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
    if (error) {
      console.error('markAllAsRead error:', error);
      setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, isRead: false } : n));
    }
  }, [notifications]);

  const markAsUnread = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: false })
      .eq('id', id);
    if (error) {
      console.error('markAsUnread error:', error);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }
  }, []);

  const markAllAsUnread = useCallback(async () => {
    const readIds = notifications.filter(n => n.isRead).map(n => n.id);
    if (readIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, isRead: false })));
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: false })
      .in('id', readIds);
    if (error) {
      console.error('markAllAsUnread error:', error);
      setNotifications(prev => prev.map(n => readIds.includes(n.id) ? { ...n, isRead: true } : n));
    }
  }, [notifications]);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('deleteNotification error:', error);
      await loadNotifications();
    }
  }, [loadNotifications]);

  const deleteAllNotifications = useCallback(async () => {
    const allIds = notifications.map(n => n.id);
    if (allIds.length === 0) return;

    setNotifications([]);
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', allIds);
    if (error) {
      console.error('deleteAllNotifications error:', error);
      await loadNotifications();
    }
  }, [notifications, loadNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead, markAsUnread, markAllAsUnread, deleteNotification, deleteAllNotifications };
};
