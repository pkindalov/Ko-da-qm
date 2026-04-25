import { useState, useCallback } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback(
    (newValue: T) => {
      setValue(newValue);
      localStorage.setItem(key, JSON.stringify(newValue));
    },
    [key],
  );

  return [value, set];
}
