const STORAGE_KEY = 'kdq_translate_usage';
export const DAILY_LIMIT = 1000;

interface UsageRecord {
  count: number;
  date: string; // YYYY-MM-DD
}

const getTodayDate = (): string => new Date().toISOString().slice(0, 10);

const loadRecord = (): UsageRecord => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: getTodayDate() };
    const parsed = JSON.parse(raw) as UsageRecord;
    if (typeof parsed.count !== 'number' || typeof parsed.date !== 'string') {
      return { count: 0, date: getTodayDate() };
    }
    return parsed;
  } catch {
    return { count: 0, date: getTodayDate() };
  }
};

export const getUsage = (): UsageRecord => {
  const record = loadRecord();
  if (record.date !== getTodayDate()) {
    return { count: 0, date: getTodayDate() };
  }
  return record;
};

export const incrementUsage = (by = 1): void => {
  const record = getUsage();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: record.count + by, date: record.date }));
};

export const isLimitReached = (): boolean => getUsage().count >= DAILY_LIMIT;
