import 'vitest-canvas-mock';
import { vi } from 'vitest';

vi.mock('phaser', () => {
  class Scene {}

  return {
    default: {
      Scene,
      AUTO: 0,
      Scale: {
        ScaleModes: {
          RESIZE: 'RESIZE',
        },
        Events: {
          RESIZE: 'resize',
        },
      },
    },
  };
});

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
});

Object.defineProperty(window, "matchMedia", {
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
  configurable: true,
});
