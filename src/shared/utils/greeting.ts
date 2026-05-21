import type { Language } from '../types';

const NOON_HOUR = 12;
const EVENING_START_HOUR = 18;

export const getGreeting = (hour: number, lang: Language): string => {
  const isEnglish = lang === 'en';
  if (hour < NOON_HOUR) return isEnglish ? 'Good morning' : 'Добро утро';
  if (hour < EVENING_START_HOUR) return isEnglish ? 'Good afternoon' : 'Добър обяд';
  return isEnglish ? 'Good evening' : 'Добър вечер';
};
