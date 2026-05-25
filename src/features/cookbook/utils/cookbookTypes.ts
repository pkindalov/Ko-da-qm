export interface CookbookSettings {
  bodyFont: 'sans' | 'serif' | 'mono';
  bodySize: number;
  titleSize: number;
  pageMarginV: number;
  pageMarginH: number;
  recipeGap: number;
}

export const DEFAULT_SETTINGS: CookbookSettings = {
  bodyFont: 'sans',
  bodySize: 11,
  titleSize: 42,
  pageMarginV: 54,
  pageMarginH: 48,
  recipeGap: 40,
};
