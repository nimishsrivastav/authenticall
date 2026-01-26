/**
 * Test Setup - Phase 8
 * Comprehensive test configuration with all mocks
 */

import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// ============================================================
// Chrome API Mock
// ============================================================

const createMockStorage = () => {
  const store: Record<string, unknown> = {};
  return {
    get: vi.fn((keys: string | string[] | null) => {
      if (keys === null) return Promise.resolve(store);
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: store[keys] });
      }
      const result: Record<string, unknown> = {};
      keys.forEach((key) => {
        if (store[key] !== undefined) {
          result[key] = store[key];
        }
      });
      return Promise.resolve(result);
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(store, items);
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach((key) => delete store[key]);
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
      return Promise.resolve();
    }),
    _getStore: () => store,
  };
};

const mockChrome = {
  runtime: {
    sendMessage: vi.fn(() => Promise.resolve()),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    id: 'test-extension-id',
    getManifest: vi.fn(() => ({
      version: '1.0.0',
      name: 'Authenticall',
      description: 'Real-time deepfake detector',
    })),
    getURL: vi.fn((path: string) => `chrome-extension://test-extension-id/${path}`),
    lastError: null as chrome.runtime.LastError | null,
  },
  storage: {
    local: createMockStorage(),
    sync: createMockStorage(),
    session: createMockStorage(),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    sendMessage: vi.fn(() => Promise.resolve()),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    update: vi.fn(() => Promise.resolve()),
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onRemoved: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  notifications: {
    create: vi.fn(
      (
        _notificationId: string,
        _options: chrome.notifications.NotificationOptions,
        callback?: (id: string) => void
      ) => {
        if (callback) callback('test-notification-id');
        return 'test-notification-id';
      }
    ),
    clear: vi.fn((_notificationId: string, callback?: (wasCleared: boolean) => void) => {
      if (callback) callback(true);
      return true;
    }),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onClosed: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(() => Promise.resolve(true)),
    clearAll: vi.fn(() => Promise.resolve(true)),
    get: vi.fn(() => Promise.resolve(null)),
    getAll: vi.fn(() => Promise.resolve([])),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setIcon: vi.fn(),
    setTitle: vi.fn(),
  },
  permissions: {
    request: vi.fn(() => Promise.resolve(true)),
    contains: vi.fn(() => Promise.resolve(true)),
  },
};

// @ts-expect-error - Mocking Chrome API
global.chrome = mockChrome;

// ============================================================
// Browser APIs Mocks
// ============================================================

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords(): MutationRecord[] {
    return [];
  }
} as unknown as typeof MutationObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Canvas
class MockCanvasRenderingContext2D {
  canvas = { width: 720, height: 480 };
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  font = '';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';

  fillRect = vi.fn();
  clearRect = vi.fn();
  strokeRect = vi.fn();
  drawImage = vi.fn();
  beginPath = vi.fn();
  closePath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  arc = vi.fn();
  fill = vi.fn();
  stroke = vi.fn();
  fillText = vi.fn();
  measureText = vi.fn(() => ({ width: 100 }));
  getImageData = vi.fn(() => ({
    data: new Uint8ClampedArray(720 * 480 * 4),
    width: 720,
    height: 480,
  }));
  putImageData = vi.fn();
  createImageData = vi.fn(() => ({
    data: new Uint8ClampedArray(720 * 480 * 4),
    width: 720,
    height: 480,
  }));
  setTransform = vi.fn();
  resetTransform = vi.fn();
  save = vi.fn();
  restore = vi.fn();
  scale = vi.fn();
  rotate = vi.fn();
  translate = vi.fn();
  transform = vi.fn();
  clip = vi.fn();
  isPointInPath = vi.fn(() => false);
  createLinearGradient = vi.fn(() => ({
    addColorStop: vi.fn(),
  }));
  createRadialGradient = vi.fn(() => ({
    addColorStop: vi.fn(),
  }));
}

const mockGetContext = vi.fn((contextId: string) => {
  if (contextId === '2d') {
    return new MockCanvasRenderingContext2D();
  }
  return null;
});

const mockToDataURL = vi.fn(
  (_type?: string, _quality?: number) =>
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q=='
);

// Override document.createElement for canvas
const originalCreateElement = document.createElement.bind(document);
document.createElement = vi.fn((tagName: string, options?: ElementCreationOptions) => {
  if (tagName.toLowerCase() === 'canvas') {
    const canvas = originalCreateElement(tagName, options);
    Object.defineProperty(canvas, 'getContext', {
      value: mockGetContext,
      writable: true,
    });
    Object.defineProperty(canvas, 'toDataURL', {
      value: mockToDataURL,
      writable: true,
    });
    return canvas;
  }
  return originalCreateElement(tagName, options);
}) as typeof document.createElement;

// Mock HTMLVideoElement
class MockHTMLVideoElement {
  videoWidth = 1920;
  videoHeight = 1080;
  readyState = 4; // HAVE_ENOUGH_DATA
  currentTime = 0;
  duration = 100;
  paused = false;
  muted = false;
  volume = 1;
  src = '';
  srcObject: MediaStream | null = null;

  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  load = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

// @ts-expect-error - Mock HTMLVideoElement
global.HTMLVideoElement = MockHTMLVideoElement;

// Mock MediaStream
class MockMediaStream {
  id = 'mock-stream-id';
  active = true;

  getTracks = vi.fn(() => []);
  getVideoTracks = vi.fn(() => []);
  getAudioTracks = vi.fn(() => []);
  addTrack = vi.fn();
  removeTrack = vi.fn();
  clone = vi.fn(() => new MockMediaStream());
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

// @ts-expect-error - Mock MediaStream
global.MediaStream = MockMediaStream;

// Mock AudioContext
class MockAudioContext {
  state = 'running';
  sampleRate = 48000;
  currentTime = 0;
  destination = {};

  createAnalyser = vi.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  createGain = vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  close = vi.fn(() => Promise.resolve());
  resume = vi.fn(() => Promise.resolve());
  suspend = vi.fn(() => Promise.resolve());
}

// @ts-expect-error - Mock AudioContext
global.AudioContext = MockAudioContext;
// @ts-expect-error - Mock webkitAudioContext
global.webkitAudioContext = MockAudioContext;

// ============================================================
// Performance API Mocks
// ============================================================

const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  memory: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 50000000,
    jsHeapSizeLimit: 100000000,
  },
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// ============================================================
// Fetch Mock
// ============================================================

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Headers(),
  } as Response)
);

// ============================================================
// Test Lifecycle Hooks
// ============================================================

beforeAll(() => {
  // Mock environment variables
  process.env.VITE_GEMINI_MODEL = 'gemini-2.5-flash';
  process.env.VITE_TRUST_THRESHOLD_SAFE = '85';
  process.env.VITE_TRUST_THRESHOLD_CAUTION = '50';

  // Silence console during tests (optional)
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();

  // Clear storage mocks
  mockChrome.storage.local.clear();
  mockChrome.storage.sync.clear();
});

afterAll(() => {
  vi.restoreAllMocks();
});

// ============================================================
// Export Mocks for Test Use
// ============================================================

export { mockChrome, MockCanvasRenderingContext2D, MockHTMLVideoElement, MockMediaStream };
