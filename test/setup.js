/**
 * Test setup and global configuration
 * Simplified version - only essential setup
 */

import { beforeAll } from 'vitest';

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
  // Verify Cloudflare Workers environment
  if (typeof globalThis.fetch === 'undefined') {
    throw new Error('fetch is not available in test environment');
  }

  // Verify required Web APIs
  const requiredGlobals = ['Request', 'Response', 'Headers', 'URL', 'URLSearchParams'];

  for (const global of requiredGlobals) {
    if (typeof globalThis[global] === 'undefined') {
      throw new Error(`Required global ${global} is not available`);
    }
  }

  // Verify SELF is available for Cloudflare Workers testing
  try {
    const { SELF } = await import('cloudflare:test');
    if (!SELF) {
      throw new Error('SELF is not available');
    }
  } catch (error) {
    console.warn('Warning: Cloudflare Workers test environment not available');
  }

  // Setup performance API if not available
  if (typeof performance === 'undefined') {
    globalThis.performance = {
      now: () => Date.now()
    };
  }
});
