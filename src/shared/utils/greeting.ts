import type { Language } from '../types';

export function getGreeting(hour: number, lang: Language): string {
  const isEnglish = lang === 'en';
  if (hour < 12) return isEnglish ? 'Good morning' : 'Добро утро';
  if (hour < 18) return isEnglish ? 'Good afternoon' : 'Добър обяд';
  return isEnglish ? 'Good evening' : 'Добър вечер';
}
