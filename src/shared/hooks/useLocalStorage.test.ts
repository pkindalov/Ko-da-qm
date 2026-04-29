import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => localStorage.clear());

  it('returns defaultValue when key is not in storage', () => {
    const { result } = renderHook(() => useLocalStorage('missing', 42));
    expect(result.current[0]).toBe(42);
  });

  it('returns stored value when key exists', () => {
    localStorage.setItem('count', JSON.stringify(7));
    const { result } = renderHook(() => useLocalStorage('count', 0));
    expect(result.current[0]).toBe(7);
  });

  it('falls back to defaultValue when stored JSON is invalid', () => {
    localStorage.setItem('bad', 'not-json{{{');
    const { result } = renderHook(() => useLocalStorage('bad', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('updates state and persists to localStorage on set', () => {
    const { result } = renderHook(() => useLocalStorage('name', 'alice'));
    act(() => result.current[1]('bob'));
    expect(result.current[0]).toBe('bob');
    expect(JSON.parse(localStorage.getItem('name')!)).toBe('bob');
  });

  it('works with object values', () => {
    const { result } = renderHook(() => useLocalStorage('obj', { x: 1 }));
    act(() => result.current[1]({ x: 99 }));
    expect(result.current[0]).toEqual({ x: 99 });
    expect(JSON.parse(localStorage.getItem('obj')!)).toEqual({ x: 99 });
  });

  it('works with array values', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('tags', []));
    act(() => result.current[1](['a', 'b']));
    expect(result.current[0]).toEqual(['a', 'b']);
  });
});
