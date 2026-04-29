import { describe, it, expect } from 'vitest';
import { filterProducts } from './productFilters';
import type { Product } from '../../../shared/types';

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: '1',
  name: 'Домати',
  emoji: '🍅',
  category: 'veg',
  status: 'liked',
  ...overrides,
});

describe('filterProducts', () => {
  it('returns all products when search is empty and filter is all', () => {
    const products = [makeProduct(), makeProduct({ id: '2', name: 'Яйца' })];
    expect(filterProducts(products, '', 'all', 'bg')).toHaveLength(2);
  });

  it('filters by name search (case-insensitive)', () => {
    const products = [makeProduct({ name: 'Домати' }), makeProduct({ id: '2', name: 'Яйца' })];
    expect(filterProducts(products, 'домати', 'all', 'bg')).toHaveLength(1);
    expect(filterProducts(products, 'ДОМАТИ', 'all', 'bg')).toHaveLength(1);
  });

  it('filters by category', () => {
    const products = [makeProduct({ category: 'veg' }), makeProduct({ id: '2', category: 'dairy', name: 'Мляко' })];
    expect(filterProducts(products, '', 'veg', 'bg')).toHaveLength(1);
  });

  it('filters by status using the catFilter field', () => {
    const products = [makeProduct({ status: 'liked' }), makeProduct({ id: '2', name: 'Лук', status: 'disliked' })];
    expect(filterProducts(products, '', 'disliked', 'bg')).toHaveLength(1);
  });

  it('uses nameEn for search when lang is en', () => {
    const products = [makeProduct({ name: 'Домати', nameEn: 'Tomatoes' })];
    expect(filterProducts(products, 'tomato', 'all', 'en')).toHaveLength(1);
    expect(filterProducts(products, 'домати', 'all', 'en')).toHaveLength(0);
  });

  it('returns empty when search matches nothing', () => {
    const products = [makeProduct({ name: 'Домати' })];
    expect(filterProducts(products, 'пица', 'all', 'bg')).toHaveLength(0);
  });
});
