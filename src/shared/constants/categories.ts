import type { Category } from '../types';

export const CATEGORIES: Category[] = [
  { id: 'protein',   label: 'Месо',       labelEn: 'Meat',        emoji: '🥩' },
  { id: 'fish',      label: 'Риба',       labelEn: 'Fish',        emoji: '🐟' },
  { id: 'dairy',     label: 'Млечни',     labelEn: 'Dairy',       emoji: '🥛' },
  { id: 'egg',       label: 'Яйца',       labelEn: 'Eggs',        emoji: '🥚' },
  { id: 'veg',       label: 'Зеленчуци',  labelEn: 'Vegetables',  emoji: '🥦' },
  { id: 'fruit',     label: 'Плодове',    labelEn: 'Fruits',      emoji: '🍎' },
  { id: 'grain',     label: 'Зърнени',    labelEn: 'Grains',      emoji: '🌾' },
  { id: 'condiment', label: 'Подправки',  labelEn: 'Condiments',  emoji: '🧂' },
  { id: 'frozen',    label: 'Замразено',  labelEn: 'Frozen',      emoji: '🧊' },
  { id: 'other',     label: 'Друго',      labelEn: 'Other',       emoji: '📦' },
];
