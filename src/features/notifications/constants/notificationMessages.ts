import type { Language, NotificationType } from '../../../shared/types';

const NOTIFICATION_MESSAGES: Record<NotificationType, Record<Language, (actorName: string) => string>> = {
  recipe_favorited: {
    bg: (actorName) => `${actorName} добави рецептата ти в любими`,
    en: (actorName) => `${actorName} added your recipe to favorites`,
  },
};

export const ANONYMOUS_ACTOR: Record<Language, string> = {
  bg: 'Някой',
  en: 'Someone',
};

const ACTOR_SENTINEL = '\x00';

export const getNotificationParts = (
  type: NotificationType,
  lang: Language,
): { before: string; after: string } => {
  const full = NOTIFICATION_MESSAGES[type][lang](ACTOR_SENTINEL);
  const [before = '', after = ''] = full.split(ACTOR_SENTINEL);
  return { before, after };
};

export const getNotificationMessage = (
  type: NotificationType,
  actorName: string | null,
  lang: Language,
): string => {
  const name = actorName ?? ANONYMOUS_ACTOR[lang];
  return NOTIFICATION_MESSAGES[type][lang](name);
};

export const formatTimeAgo = (dateStr: string, lang: Language): string => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

  if (seconds < 60) return lang === 'en' ? 'just now' : 'сега';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return lang === 'en' ? `${minutes}m ago` : `преди ${minutes}м`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === 'en' ? `${hours}h ago` : `преди ${hours}ч`;

  const days = Math.floor(hours / 24);
  return lang === 'en' ? `${days}d ago` : `преди ${days}д`;
};
