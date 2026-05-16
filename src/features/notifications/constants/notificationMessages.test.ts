import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNotificationMessage, getNotificationParts, formatTimeAgo } from './notificationMessages';

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

describe('getNotificationParts', () => {
  it('returns correct parts for recipe_favorited in english', () => {
    const parts = getNotificationParts('recipe_favorited', 'en');
    expect(parts.entityKeyword).toBe('your recipe');
    expect(parts.betweenActorEntity).toBe(' added ');
    expect(parts.afterEntity).toBe(' to favorites');
  });

  it('returns correct parts for recipe_favorited in bulgarian', () => {
    const parts = getNotificationParts('recipe_favorited', 'bg');
    expect(parts.entityKeyword).toBe('рецептата ти');
    expect(parts.betweenActorEntity).toBe(' добави ');
    expect(parts.afterEntity).toBe(' в любими');
  });

  it('returns correct parts for user_followed in english', () => {
    const parts = getNotificationParts('user_followed', 'en');
    expect(parts.entityKeyword).toBe('');
    expect(parts.betweenActorEntity).toBe(' started following you');
  });

  it('returns correct parts for user_followed in bulgarian', () => {
    const parts = getNotificationParts('user_followed', 'bg');
    expect(parts.entityKeyword).toBe('');
    expect(parts.betweenActorEntity).toBe(' те последва');
  });
});

describe('getNotificationMessage – user_followed', () => {
  it('returns english message with actor name for user_followed', () => {
    expect(getNotificationMessage('user_followed', 'Alice', 'en'))
      .toBe('Alice started following you');
  });

  it('returns bulgarian message with actor name for user_followed', () => {
    expect(getNotificationMessage('user_followed', 'Иван', 'bg'))
      .toBe('Иван те последва');
  });

  it('uses anonymous fallback in english when actorName is null', () => {
    expect(getNotificationMessage('user_followed', null, 'en'))
      .toBe('Someone started following you');
  });

  it('uses anonymous fallback in bulgarian when actorName is null', () => {
    expect(getNotificationMessage('user_followed', null, 'bg'))
      .toBe('Някой те последва');
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
