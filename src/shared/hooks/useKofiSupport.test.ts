import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useKofiSupport } from './useKofiSupport';

const setViewport = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
};

describe('useKofiSupport', () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('opens the modal on desktop without opening a new tab', () => {
    setViewport(1024);
    const { result } = renderHook(() => useKofiSupport());

    act(() => result.current.openSupport());

    expect(result.current.open).toBe(true);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('opens Ko-fi in a new tab on mobile and leaves the modal closed', () => {
    setViewport(375);
    const { result } = renderHook(() => useKofiSupport());

    act(() => result.current.openSupport());

    expect(result.current.open).toBe(false);
    expect(openSpy).toHaveBeenCalledWith('https://ko-fi.com/pkindalov', '_blank', 'noopener,noreferrer');
  });

  it('close() resets the modal state', () => {
    setViewport(1024);
    const { result } = renderHook(() => useKofiSupport());

    act(() => result.current.openSupport());
    act(() => result.current.close());

    expect(result.current.open).toBe(false);
  });
});
