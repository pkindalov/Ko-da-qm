import '@testing-library/jest-dom';

// jsdom has no matchMedia. Provide a default that evaluates min/max-width
// queries against window.innerWidth (jsdom defaults to 1024 = desktop).
// Tests can override per-case via Object.defineProperty.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => {
    const minWidth = /min-width:\s*(\d+)px/.exec(query);
    const maxWidth = /max-width:\s*(\d+)px/.exec(query);
    const width = window.innerWidth;
    const matches =
      (minWidth == null || width >= Number(minWidth[1])) &&
      (maxWidth == null || width <= Number(maxWidth[1]));
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
  };
}

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
  Toaster: () => null,
}));
