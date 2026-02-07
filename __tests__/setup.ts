import '@testing-library/jest-dom/vitest'

// Polyfill scrollIntoView for jsdom (not implemented in jsdom)
// This runs in the test environment, so Element is available in jsdom
try {
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {}
  }
} catch {
  // Not in a browser environment
}
