import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';

export const useLocalStorage = <T,>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback(
    (newValue: SetStateAction<T>) => {
      setValue(prev => {
        const next = typeof newValue === 'function' ? (newValue as (prevState: T) => T)(prev) : newValue;
        localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    },
    [key],
  );

  return [value, set];
}
