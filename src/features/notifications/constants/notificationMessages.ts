import type { Language, NotificationType } from '../../../shared/types';

export const ANONYMOUS_ACTOR: Record<Language, string> = {
  bg: 'Някой',
  en: 'Someone',
};

const ACTOR_SENTINEL = '\x00';
const ENTITY_SENTINEL = '\x01';

const NOTIFICATION_TEMPLATES: Record<NotificationType, Record<Language, string>> = {
  recipe_favorited: {
    en: `${ACTOR_SENTINEL} added ${ENTITY_SENTINEL} to favorites`,
    bg: `${ACTOR_SENTINEL} добави ${ENTITY_SENTINEL} в любими`,
  },
};

const ENTITY_KEYWORDS: Record<NotificationType, Record<Language, string>> = {
  recipe_favorited: {
    en: 'your recipe',
    bg: 'рецептата ти',
  },
};

export interface NotificationMessageParts {
  beforeActor: string;
  betweenActorEntity: string;
  entityKeyword: string;
  afterEntity: string;
}

export const getNotificationParts = (
  type: NotificationType,
  lang: Language,
): NotificationMessageParts => {
  const template = NOTIFICATION_TEMPLATES[type][lang];
  const entityKeyword = ENTITY_KEYWORDS[type][lang];
  const [beforeActor = '', entityAndAfter = ''] = template.split(ACTOR_SENTINEL);
  const [betweenActorEntity = '', afterEntity = ''] = entityAndAfter.split(ENTITY_SENTINEL);
  return { beforeActor, betweenActorEntity, entityKeyword, afterEntity };
};

export const getNotificationMessage = (
  type: NotificationType,
  actorName: string | null,
  lang: Language,
): string => {
  const name = actorName ?? ANONYMOUS_ACTOR[lang];
  const { beforeActor, betweenActorEntity, entityKeyword, afterEntity } = getNotificationParts(type, lang);
  return `${beforeActor}${name}${betweenActorEntity}${entityKeyword}${afterEntity}`;
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
