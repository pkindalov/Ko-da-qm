import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useKofiSupport } from './useKofiSupport';

const mockTouchDevice = (isTouch: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: isTouch,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('useKofiSupport', () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('opens the modal on a non-touch desktop without opening a new tab', () => {
    mockTouchDevice(false);
    const { result } = renderHook(() => useKofiSupport());

    act(() => result.current.openSupport());

    expect(result.current.open).toBe(true);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('opens Ko-fi in a new tab on a touch device (phone or tablet) and leaves the modal closed', () => {
    mockTouchDevice(true);
    const { result } = renderHook(() => useKofiSupport());

    act(() => result.current.openSupport());

    expect(result.current.open).toBe(false);
    expect(openSpy).toHaveBeenCalledWith('https://ko-fi.com/pkindalov', '_blank', 'noopener,noreferrer');
  });

  it('close() resets the modal state', () => {
    mockTouchDevice(false);
    const { result } = renderHook(() => useKofiSupport());

    act(() => result.current.openSupport());
    act(() => result.current.close());

    expect(result.current.open).toBe(false);
  });
});
