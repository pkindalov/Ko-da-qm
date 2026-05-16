import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNotificationMessage, formatTimeAgo } from './notificationMessages';

describe('getNotificationMessage', () => {
  it('returns bulgarian message with actor name for recipe_favorited', () => {
    expect(getNotificationMessage('recipe_favorited', 'Иван', 'bg'))
      .toBe('Иван добави рецептата ти в любими');
  });

  it('returns english message with actor name for recipe_favorited', () => {
    expect(getNotificationMessage('recipe_favorited', 'John', 'en'))
      .toBe('John added your recipe to favorites');
  });

  it('uses anonymous fallback in bulgarian when actorName is null', () => {
    expect(getNotificationMessage('recipe_favorited', null, 'bg'))
      .toBe('Някой добави рецептата ти в любими');
  });

  it('uses anonymous fallback in english when actorName is null', () => {
    expect(getNotificationMessage('recipe_favorited', null, 'en'))
      .toBe('Someone added your recipe to favorites');
  });
});

describe('formatTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps within the last minute (en)', () => {
    const date = new Date('2024-01-01T11:59:30Z').toISOString();
    expect(formatTimeAgo(date, 'en')).toBe('just now');
  });

  it('returns "сега" for timestamps within the last minute (bg)', () => {
    const date = new Date('2024-01-01T11:59:30Z').toISOString();
    expect(formatTimeAgo(date, 'bg')).toBe('сега');
  });

  it('returns minutes ago for timestamps between 1 and 59 minutes (en)', () => {
    const date = new Date('2024-01-01T11:45:00Z').toISOString();
    expect(formatTimeAgo(date, 'en')).toBe('15m ago');
  });

  it('returns minutes ago for timestamps between 1 and 59 minutes (bg)', () => {
    const date = new Date('2024-01-01T11:45:00Z').toISOString();
    expect(formatTimeAgo(date, 'bg')).toBe('преди 15м');
  });

  it('returns hours ago for timestamps between 1 and 23 hours (en)', () => {
    const date = new Date('2024-01-01T09:00:00Z').toISOString();
    expect(formatTimeAgo(date, 'en')).toBe('3h ago');
  });

  it('returns hours ago for timestamps between 1 and 23 hours (bg)', () => {
    const date = new Date('2024-01-01T09:00:00Z').toISOString();
    expect(formatTimeAgo(date, 'bg')).toBe('преди 3ч');
  });

  it('returns days ago for timestamps older than 24 hours (en)', () => {
    const date = new Date('2023-12-30T12:00:00Z').toISOString();
    expect(formatTimeAgo(date, 'en')).toBe('2d ago');
  });

  it('returns days ago for timestamps older than 24 hours (bg)', () => {
    const date = new Date('2023-12-30T12:00:00Z').toISOString();
    expect(formatTimeAgo(date, 'bg')).toBe('преди 2д');
  });
});
