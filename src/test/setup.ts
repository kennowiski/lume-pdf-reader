import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom não implementa matchMedia — usado pelo useActiveTheme.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// jsdom não implementa IntersectionObserver — usado pelo PdfViewer no modo Scroll.
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
// @ts-expect-error - polyfill mínimo só para os testes
window.IntersectionObserver = MockIntersectionObserver;

// jsdom não implementa ResizeObserver — usado pelo PdfViewer para recentralizar
// o PDF ao dar zoom.
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = MockResizeObserver;

// jsdom não implementa scrollIntoView.
Element.prototype.scrollIntoView = vi.fn();
