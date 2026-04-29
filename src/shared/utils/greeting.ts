import type { Language } from '../types';

export function getGreeting(hour: number, lang: Language): string {
  const L = lang === 'en';
  if (hour < 12) return L ? 'Good morning' : 'Добро утро';
  if (hour < 18) return L ? 'Good afternoon' : 'Добър обяд';
  return L ? 'Good evening' : 'Добър вечер';
}
