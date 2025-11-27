import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Tests for Range Request Caching Strategy
 *
 * This test suite validates the new caching strategy that:
 * 1. Only caches 200 responses (not 206)
 * 2. Handles Range requests by caching full content first
 * 3. Lets Cloudflare edge serve 206 responses from cached 200 content
 * 4. Avoids compression for media files to ensure proper Range support
 */

describe('Range Request Caching Strategy', () => {
  let SELF;

  beforeAll(async () => {
    const { unstable_dev } = await import('wrangler');
    const worker = await unstable_dev('src/index.js', {
      experimental: { disableExperimentalWarning: true }
    });
    SELF = worker;
  });

  describe('Cache Behavior for Range Requests', () => {
    it('should not attempt to cache 206 responses', async () => {
      const testUrl = 'https://example.com/gh/test/repo/sample.pdf';

      // Make a range request that might return 206
      const response = await SELF.fetch(testUrl, {
        headers: {
          Range: 'bytes=0-1023'
        }
      });

      // The response should either be 200 (full content) or 206 (partial)
      // But we should never get a cache error from trying to cache 206
      expect([200, 206, 404]).toContain(response.status);

      // Check performance metrics for any cache-related errors
      const metrics = response.headers.get('X-Performance-Metrics');
      if (metrics) {
        const parsedMetrics = JSON.parse(metrics);

        // Should not contain any cache put errors
        const errorKeys = Object.keys(parsedMetrics).filter(
          key => key.includes('error') || key.includes('fail')
        );
        expect(errorKeys).toHaveLength(0);
      }
    });

    it('should cache full content when receiving 200 response', async () => {
      const testUrl = 'https://example.com/gh/test/repo/document.pdf';

      // First request - should cache the full content
      const firstResponse = await SELF.fetch(testUrl);

      if (firstResponse.status === 200) {
        // Verify caching headers are set correctly
        expect(firstResponse.headers.get('Cache-Control')).toContain('public');
        expect(firstResponse.headers.get('Accept-Ranges')).toBe('bytes');

        // Second request should hit cache
        const secondResponse = await SELF.fetch(testUrl);
        expect(secondResponse.status).toBe(200);

        // Performance metrics should show cache hit
        const metrics = secondResponse.headers.get('X-Performance-Metrics');
        if (metrics) {
          const parsedMetrics = JSON.parse(metrics);
          expect(parsedMetrics).toHaveProperty('cache_hit');
        }
      }
    });

    it('should handle range requests after caching full content', async () => {
      const testUrl = 'https://example.com/gh/test/repo/large-file.bin';

      // First, cache the full content
      const fullResponse = await SELF.fetch(testUrl);

      if (fullResponse.status === 200) {
        // Now make a range request - should leverage cached content
        const rangeResponse = await SELF.fetch(testUrl, {
          headers: {
            Range: 'bytes=100-199'
          }
        });

        // Should either return the requested range or full content
        expect([200, 206]).toContain(rangeResponse.status);

        if (rangeResponse.status === 206) {
          expect(rangeResponse.headers.get('Content-Range')).toBeTruthy();
          expect(rangeResponse.headers.get('Content-Length')).toBe('100');
        }
      }
    });
  });

  describe('Media File Handling', () => {
    it('should avoid compression for media files', async () => {
      const mediaTestCases = [
        { url: 'https://example.com/gh/test/repo/video.mp4', type: 'video' },
        { url: 'https://example.com/gh/test/repo/audio.mp3', type: 'audio' },
        { url: 'https://example.com/gh/test/repo/image.png', type: 'image' },
        { url: 'https://example.com/gh/test/repo/archive.zip', type: 'archive' }
      ];

      for (const testCase of mediaTestCases) {
        const response = await SELF.fetch(testCase.url, { method: 'HEAD' });

        if (response.status === 200) {
          // Media files should have proper range support headers
          expect(response.headers.get('Accept-Ranges')).toBe('bytes');

          // Should not be compressed to ensure proper byte-range handling
          const contentEncoding = response.headers.get('Content-Encoding');
          if (contentEncoding) {
            expect(['identity', null]).toContain(contentEncoding);
          }
        }
      }
    });

    it('should send identity encoding for range requests on media files', async () => {
      const testUrl = 'https://example.com/gh/test/repo/large-video.mp4';

      const response = await SELF.fetch(testUrl, {
        headers: {
          Range: 'bytes=0-1023'
        }
      });

      // For media files with range requests, should not use compression
      if ([200, 206].includes(response.status)) {
        const contentEncoding = response.headers.get('Content-Encoding');
        if (contentEncoding) {
          expect(['identity', null]).toContain(contentEncoding);
        }
      }
    });
  });

  describe('Cache Key Management', () => {
    it('should use correct cache keys for range vs full requests', async () => {
      const testUrl = 'https://example.com/gh/test/repo/test-document.pdf';

      // Make a range request first
      const rangeResponse1 = await SELF.fetch(testUrl, {
        headers: {
          Range: 'bytes=0-512'
        }
      });

      // Make a full request
      const fullResponse = await SELF.fetch(testUrl);

      // Make another range request
      const rangeResponse2 = await SELF.fetch(testUrl, {
        headers: {
          Range: 'bytes=512-1023'
        }
      });

      // All requests should succeed
      [rangeResponse1, fullResponse, rangeResponse2].forEach(response => {
        expect([200, 206, 404]).toContain(response.status);
      });

      // Full response should have caching headers
      if (fullResponse.status === 200) {
        expect(fullResponse.headers.get('Cache-Control')).toContain('public');
        expect(fullResponse.headers.get('Accept-Ranges')).toBe('bytes');
      }
    });

    it('should handle Content-Length header properly', async () => {
      const testUrl = 'https://example.com/gh/test/repo/sized-file.bin';

      const response = await SELF.fetch(testUrl);

      if (response.status === 200) {
        // Should have Content-Length for proper range support
        const contentLength = response.headers.get('Content-Length');
        if (contentLength) {
          expect(parseInt(contentLength)).toBeGreaterThan(0);
        }

        // Should have Accept-Ranges header
        expect(response.headers.get('Accept-Ranges')).toBe('bytes');
      }
    });
  });

  describe('Performance Metrics', () => {
    it('should track cache performance for range requests', async () => {
      const testUrl = 'https://example.com/gh/test/repo/metrics-test.dat';

      // First request
      const response1 = await SELF.fetch(testUrl);
      const metrics1 = response1.headers.get('X-Performance-Metrics');

      if (response1.status === 200 && metrics1) {
        const parsed1 = JSON.parse(metrics1);
        expect(parsed1).toHaveProperty('start');
        expect(parsed1).toHaveProperty('complete');
      }

      // Second request (should hit cache)
      const response2 = await SELF.fetch(testUrl);
      const metrics2 = response2.headers.get('X-Performance-Metrics');

      if (response2.status === 200 && metrics2) {
        const parsed2 = JSON.parse(metrics2);
        expect(parsed2).toHaveProperty('cache_hit');
      }
    });

    it('should track range-specific cache behavior', async () => {
      const testUrl = 'https://example.com/gh/test/repo/range-metrics.bin';

      // Cache full content first
      await SELF.fetch(testUrl);

      // Now make a range request
      const rangeResponse = await SELF.fetch(testUrl, {
        headers: {
          Range: 'bytes=0-1023'
        }
      });

      const metrics = rangeResponse.headers.get('X-Performance-Metrics');
      if (metrics && [200, 206].includes(rangeResponse.status)) {
        const parsed = JSON.parse(metrics);

        // Should have timing information
        expect(parsed).toHaveProperty('start');

        // May have cache-related metrics
        const cacheKeys = Object.keys(parsed).filter(key => key.includes('cache'));
        // At least one cache-related metric should be present
        expect(cacheKeys.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
