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
  user_followed: {
    en: `${ACTOR_SENTINEL} started following you`,
    bg: `${ACTOR_SENTINEL} те последва`,
  },
};

const ENTITY_KEYWORDS: Record<NotificationType, Record<Language, string>> = {
  recipe_favorited: {
    en: 'your recipe',
    bg: 'рецептата ти',
  },
  user_followed: {
    en: '',
    bg: '',
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

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export const formatTimeAgo = (dateStr: string, lang: Language): string => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / MS_PER_SECOND);

  if (seconds < SECONDS_PER_MINUTE) return lang === 'en' ? 'just now' : 'сега';

  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) return lang === 'en' ? `${minutes}m ago` : `преди ${minutes}м`;

  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return lang === 'en' ? `${hours}h ago` : `преди ${hours}ч`;

  const days = Math.floor(hours / HOURS_PER_DAY);
  return lang === 'en' ? `${days}d ago` : `преди ${days}д`;
};
