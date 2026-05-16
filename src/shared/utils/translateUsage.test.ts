import { describe, it, expect, beforeEach } from 'vitest';
import { getUsage, incrementUsage, isLimitReached, DAILY_LIMIT } from './translateUsage';

const STORAGE_KEY = 'kdq_translate_usage';
const TODAY = new Date().toISOString().slice(0, 10);

describe('getUsage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns count 0 and today when nothing is stored', () => {
    const usage = getUsage();
    expect(usage.count).toBe(0);
    expect(usage.date).toBe(TODAY);
  });

  it('returns stored count when date is today', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 42, date: TODAY }));
    expect(getUsage().count).toBe(42);
  });

  it('resets count to 0 when stored date is in the past', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 500, date: '2020-01-01' }));
    const usage = getUsage();
    expect(usage.count).toBe(0);
    expect(usage.date).toBe(TODAY);
  });

  it('returns fresh record when stored JSON is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    const usage = getUsage();
    expect(usage.count).toBe(0);
    expect(usage.date).toBe(TODAY);
  });

  it('returns fresh record when stored object has wrong shape (missing count)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: TODAY }));
    const usage = getUsage();
    expect(usage.count).toBe(0);
  });

  it('returns fresh record when stored object has wrong shape (count is a string)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: '500', date: TODAY }));
    const usage = getUsage();
    expect(usage.count).toBe(0);
  });

  it('returns fresh record when stored object has wrong shape (date is a number)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 10, date: 20240101 }));
    const usage = getUsage();
    expect(usage.count).toBe(0);
  });
});

describe('incrementUsage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('increments count by 1 when called with no argument', () => {
    incrementUsage();
    expect(getUsage().count).toBe(1);
  });

  it('increments count by the given amount', () => {
    incrementUsage(5);
    expect(getUsage().count).toBe(5);
  });

  it('accumulates across multiple calls', () => {
    incrementUsage();
    incrementUsage();
    incrementUsage(3);
    expect(getUsage().count).toBe(5);
  });

  it('starts from 0 when date is stale, then increments correctly', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 999, date: '2020-01-01' }));
    incrementUsage();
    expect(getUsage().count).toBe(1);
  });

  it('preserves today date after increment', () => {
    incrementUsage(10);
    expect(getUsage().date).toBe(TODAY);
  });
});

describe('isLimitReached', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when count is 0', () => {
    expect(isLimitReached()).toBe(false);
  });

  it('returns false when count is below the limit', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: DAILY_LIMIT - 1, date: TODAY }));
    expect(isLimitReached()).toBe(false);
  });

  it('returns true when count equals the limit', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: DAILY_LIMIT, date: TODAY }));
    expect(isLimitReached()).toBe(true);
  });

  it('returns true when count exceeds the limit', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: DAILY_LIMIT + 50, date: TODAY }));
    expect(isLimitReached()).toBe(true);
  });

  it('returns false after a stale date record (auto-reset)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: DAILY_LIMIT, date: '2020-01-01' }));
    expect(isLimitReached()).toBe(false);
  });
});
