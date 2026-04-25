import type { FridgeItem, Product, Recipe, Profile, Tweaks } from '../types';

export const DEFAULT_TWEAKS: Tweaks = {
  theme: 'warm',
  lang: 'bg',
  showEmoji: true,
};

export const DEFAULT_PROFILE: Profile = {
  name: '',
  allergies: ['ядки'],
  dislikes: ['гъби', 'лук', 'риба'],
  dietaryPrefs: [],
};

export const DEFAULT_FRIDGE: FridgeItem[] = [
  { id: 'f1', name: 'Яйца',     emoji: '🥚', category: 'egg'   },
  { id: 'f2', name: 'Кашкавал', emoji: '🧀', category: 'dairy' },
  { id: 'f3', name: 'Хляб',     emoji: '🍞', category: 'grain' },
  { id: 'f4', name: 'Масло',    emoji: '🧈', category: 'dairy' },
  { id: 'f5', name: 'Мляко',    emoji: '🥛', category: 'dairy' },
];

export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1',  name: 'Яйца',     nameEn: 'Eggs',       category: 'egg',     status: 'liked',    emoji: '🥚' },
  { id: 'p2',  name: 'Кашкавал', nameEn: 'Cheese',     category: 'dairy',   status: 'liked',    emoji: '🧀' },
  { id: 'p3',  name: 'Хляб',     nameEn: 'Bread',      category: 'grain',   status: 'liked',    emoji: '🍞' },
  { id: 'p4',  name: 'Масло',    nameEn: 'Butter',     category: 'dairy',   status: 'liked',    emoji: '🧈' },
  { id: 'p5',  name: 'Мляко',    nameEn: 'Milk',       category: 'dairy',   status: 'liked',    emoji: '🥛' },
  { id: 'p6',  name: 'Ориз',     nameEn: 'Rice',       category: 'grain',   status: 'liked',    emoji: '🍚' },
  { id: 'p7',  name: 'Пиле',     nameEn: 'Chicken',    category: 'protein', status: 'liked',    emoji: '🍗' },
  { id: 'p8',  name: 'Картофи',  nameEn: 'Potatoes',   category: 'veg',     status: 'liked',    emoji: '🥔' },
  { id: 'p9',  name: 'Банан',    nameEn: 'Banana',     category: 'fruit',   status: 'liked',    emoji: '🍌' },
  { id: 'p10', name: 'Ябълка',   nameEn: 'Apple',      category: 'fruit',   status: 'liked',    emoji: '🍎' },
  { id: 'p11', name: 'Гъби',     nameEn: 'Mushrooms',  category: 'veg',     status: 'disliked', emoji: '🍄' },
  { id: 'p12', name: 'Лук',      nameEn: 'Onion',      category: 'veg',     status: 'disliked', emoji: '🧅' },
  { id: 'p13', name: 'Риба',     nameEn: 'Fish',       category: 'fish',    status: 'disliked', emoji: '🐟' },
  { id: 'p14', name: 'Ядки',     nameEn: 'Nuts',       category: 'other',   status: 'allergic', emoji: '🥜' },
];

export const DEFAULT_RECIPES: Recipe[] = [
  {
    id: 'r1', name: 'Омлет с кашкавал', nameEn: 'Cheese Omelette', emoji: '🍳',
    ingredients: ['3 яйца', '50г кашкавал', '1 с.л. масло', 'сол'],
    steps: ['Разбий яйцата с малко сол в купа.', 'Загрей маслото в тиган на среден огън.', 'Излей яйцата и ги разпредели.', 'Добави кашкавала и сгъни омлета.', 'Готов е след 2-3 минути!'],
    time: 10, tags: ['закуска', 'лесно'], requiredIngredients: ['яйца', 'кашкавал', 'масло'], isAI: false,
  },
  {
    id: 'r2', name: 'Макарони с масло', nameEn: 'Buttered Pasta', emoji: '🍝',
    ingredients: ['200г макарони', '50г масло', '100г кашкавал', 'сол'],
    steps: ['Свари макароните в подсолена вода.', 'Прецеди ги.', 'Добави маслото и разбъркай.', 'Настържи кашкавала отгоре.'],
    time: 15, tags: ['обяд', 'лесно'], requiredIngredients: ['макарони', 'масло', 'кашкавал'], isAI: false,
  },
  {
    id: 'r3', name: 'Тост с масло', nameEn: 'Buttered Toast', emoji: '🍞',
    ingredients: ['2 филии хляб', 'масло'],
    steps: ['Препечи хляба.', 'Намажи с масло докато е топъл.'],
    time: 5, tags: ['закуска', 'много лесно'], requiredIngredients: ['хляб', 'масло'], isAI: false,
  },
  {
    id: 'r4', name: 'Ориз с пиле', nameEn: 'Rice with Chicken', emoji: '🍗',
    ingredients: ['1 пилешко филе', '1 чаша ориз', '2 чаши вода', 'сол', 'олио'],
    steps: ['Наряжи пилето на кубчета.', 'Запържи в олиото до зачервяване.', 'Добави ориза и водата.', 'Вари на тих огън 20 мин.'],
    time: 30, tags: ['обяд', 'вечеря'], requiredIngredients: ['пиле', 'ориз'], isAI: false,
  },
];
