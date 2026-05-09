import type { FridgeItem, Product, Recipe, Profile, Tweaks } from '../types';

export const DEFAULT_TWEAKS: Tweaks = {
  theme: 'warm',
  lang: 'bg',
  showEmoji: true,
};

export const DEFAULT_PROFILE: Profile = {
  name: '',
  allergies: [],
  dislikes: [],
  dietaryPrefs: [],
};

export const DEFAULT_FRIDGE: FridgeItem[] = [];

export const DEFAULT_PRODUCTS: Product[] = [];

export const DEFAULT_RECIPES: Recipe[] = [];
