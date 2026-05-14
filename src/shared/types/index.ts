export type Tab = 'home' | 'fridge' | 'recipes' | 'products' | 'profile';

export type Language = 'bg' | 'en';

export type Theme = 'warm' | 'cool' | 'dark';

export interface Tweaks {
  theme: Theme;
  lang: Language;
  showEmoji: boolean;
}

export interface Profile {
  name: string;
  allergies: string[];
  dislikes: string[];
  dietaryPrefs: string[];
}

export type FridgeItemCategory =
  | 'protein'
  | 'fish'
  | 'dairy'
  | 'egg'
  | 'veg'
  | 'fruit'
  | 'grain'
  | 'condiment'
  | 'other';

export interface FridgeItem {
  id: string;
  name: string;
  emoji: string;
  category: FridgeItemCategory;
}

export type ProductStatus = 'liked' | 'disliked' | 'allergic';

export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  category: FridgeItemCategory;
  status: ProductStatus;
  emoji: string;
}

export interface Recipe {
  id: string;
  name: string;
  nameEn?: string;
  emoji: string;
  imageUrl?: string;
  ingredients: string[];
  steps: string[];
  time: number;
  tags: string[];
  requiredIngredients: string[];
  isAI: boolean;
  isPublic: boolean;
  authorName?: string;
  authorEmail?: string;
}

export interface Category {
  id: FridgeItemCategory;
  label: string;
  labelEn: string;
  emoji: string;
}
