import type { Language, Tweaks } from '../types';
import { DEFAULT_TWEAKS } from '../constants/defaults';
import { useLocalStorage } from './useLocalStorage';

export const useLang = (): [Language, () => void] => {
  const [tweaks, setTweaks] = useLocalStorage<Tweaks>('kdq_tweaks', DEFAULT_TWEAKS);
  const toggleLang = () =>
    setTweaks(prev => ({ ...prev, lang: prev.lang === 'bg' ? 'en' : 'bg' }));
  return [tweaks.lang, toggleLang];
};
