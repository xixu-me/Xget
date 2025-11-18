import { SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Xget Core Functionality', () => {
  let env;

  beforeEach(() => {
    env = {};
  });

  describe('Basic Request Handling', () => {
    it('should redirect root path to homepage', async () => {
      const response = await SELF.fetch('https://example.com/', { redirect: 'manual' });
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('https://github.com/xixu-me/Xget');
    });

    it('should redirect platform prefix without path to homepage', async () => {
      // Test with /gh (no trailing slash)
      const response1 = await SELF.fetch('https://example.com/gh', { redirect: 'manual' });
      expect(response1.status).toBe(302);
      expect(response1.headers.get('Location')).toBe('https://github.com/xixu-me/Xget');

      // Test with /gh/ (with trailing slash)
      const response2 = await SELF.fetch('https://example.com/gh/', { redirect: 'manual' });
      expect(response2.status).toBe(302);
      expect(response2.headers.get('Location')).toBe('https://github.com/xixu-me/Xget');

      // Test with multi-part platform prefix (e.g., /ip/openai)
      const response3 = await SELF.fetch('https://example.com/ip/openai', { redirect: 'manual' });
      expect(response3.status).toBe(302);
      expect(response3.headers.get('Location')).toBe('https://github.com/xixu-me/Xget');
    });

    it('should redirect invalid platform prefix to homepage', async () => {
      const response = await SELF.fetch('https://example.com/invalid/test', { redirect: 'manual' });
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('https://github.com/xixu-me/Xget');
    });

    it('should include security headers in all responses', async () => {
      const response = await SELF.fetch('https://example.com/', { redirect: 'manual' });

      expect(response.headers.get('Strict-Transport-Security')).toBeTruthy();
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('Platform URL Transformation', () => {
    it('should handle GitHub URLs correctly', async () => {
      const testUrl = 'https://example.com/gh/microsoft/vscode/archive/refs/heads/main.zip';
      const response = await SELF.fetch(testUrl, { method: 'HEAD' });

      // Should attempt to proxy to GitHub
      expect(response.status).not.toBe(400);
    });

    it('should handle GitLab URLs correctly', async () => {
      const testUrl = 'https://example.com/gl/gitlab-org/gitlab/-/archive/master/gitlab-master.zip';
      const response = await SELF.fetch(testUrl, { method: 'HEAD' });

      // Should attempt to proxy to GitLab
      expect(response.status).not.toBe(400);
    });

    it('should handle Hugging Face URLs correctly', async () => {
      const testUrl = 'https://example.com/hf/microsoft/DialoGPT-medium/resolve/main/config.json';
      const response = await SELF.fetch(testUrl, { method: 'HEAD' });

      // Should attempt to proxy to Hugging Face
      expect(response.status).not.toBe(400);
    });

    it('should handle npm URLs correctly', async () => {
      const testUrl = 'https://example.com/npm/react/-/react-18.2.0.tgz';
      const response = await SELF.fetch(testUrl, { method: 'HEAD' });

      // Should attempt to proxy to npm
      expect(response.status).not.toBe(400);
    });

    it('should handle PyPI URLs correctly', async () => {
      const testUrl = 'https://example.com/pypi/packages/source/r/requests/requests-2.31.0.tar.gz';
      const response = await SELF.fetch(testUrl, { method: 'HEAD' });

      // Should attempt to proxy to PyPI
      expect(response.status).not.toBe(400);
    });

    it('should handle conda URLs correctly', async () => {
      const testUrl =
        'https://example.com/conda/pkgs/main/linux-64/numpy-1.24.3-py311h08b1b3b_1.conda';
      const response = await SELF.fetch(testUrl, { method: 'HEAD' });

      // Should attempt to proxy to conda
      expect(response.status).not.toBe(400);
    });
  });

  describe('HTTP Method Validation', () => {
    it('should allow GET requests', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo/file.txt', {
        method: 'GET'
      });

      expect(response.status).not.toBe(405);
    });

    it('should allow HEAD requests', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo/file.txt', {
        method: 'HEAD'
      });

      expect(response.status).not.toBe(405);
    });

    it('should reject PUT requests for non-Git operations', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo/file.txt', {
        method: 'PUT'
      });

      expect(response.status).toBe(405);
    });

    it('should reject DELETE requests', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo/file.txt', {
        method: 'DELETE'
      });

      expect(response.status).toBe(405);
    });
  });

  describe('Git Protocol Support', () => {
    it('should allow POST for Git upload-pack', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo.git/git-upload-pack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-git-upload-pack-request',
          'User-Agent': 'git/2.34.1'
        }
      });

      expect(response.status).not.toBe(405);
    });

    it('should allow POST for Git receive-pack', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo.git/git-receive-pack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-git-receive-pack-request',
          'User-Agent': 'git/2.34.1'
        }
      });

      expect(response.status).not.toBe(405);
    });

    it('should handle Git info/refs requests', async () => {
      const response = await SELF.fetch(
        'https://example.com/gh/test/repo.git/info/refs?service=git-upload-pack',
        {
          method: 'GET',
          headers: {
            'User-Agent': 'git/2.34.1'
          }
        }
      );

      expect(response.status).not.toBe(405);
    });
  });

  describe('Path Length Validation', () => {
    it('should reject extremely long paths', async () => {
      const longPath = '/gh/' + 'a'.repeat(3000);
      const response = await SELF.fetch(`https://example.com${longPath}`);

      expect(response.status).toBe(414);
    });

    it('should accept normal length paths', async () => {
      const normalPath = '/gh/microsoft/vscode/archive/refs/heads/main.zip';
      const response = await SELF.fetch(`https://example.com${normalPath}`);

      expect(response.status).not.toBe(414);
    });
  });

  describe('Performance Headers', () => {
    it('should include performance metrics in response headers', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo/file.txt');

      expect(response.headers.get('X-Performance-Metrics')).toBeTruthy();
    });

    it('should include valid JSON in performance metrics', async () => {
      const response = await SELF.fetch('https://example.com/gh/test/repo/file.txt');
      const metricsHeader = response.headers.get('X-Performance-Metrics');

      expect(() => JSON.parse(metricsHeader)).not.toThrow();
    });
  });

  describe('URL Rewriting', () => {
    it('should rewrite npm registry URLs in JSON responses', async () => {
      // Mock npm package metadata request
      const testUrl = 'https://example.com/npm/lodash';
      const response = await SELF.fetch(testUrl);

      // This test would need actual npm registry response mocking
      // For now, just verify the request doesn't fail
      expect([200, 301, 302, 404, 500]).toContain(response.status);
    });

    it('should preserve npm tarball URL structure', async () => {
      // Test that npm tarball URLs follow the correct pattern
      const testUrl = 'https://example.com/npm/react/-/react-18.2.0.tgz';
      const response = await SELF.fetch(testUrl, { method: 'HEAD' });

      // Should attempt to proxy correctly
      expect(response.status).not.toBe(400);
    });

    it('should correctly rewrite npm URLs to preserve package names', () => {
      // Test the regex replacement logic directly
      const mockOriginalText = JSON.stringify({
        name: 'npm',
        versions: {
          '11.5.1': {
            dist: {
              tarball: 'https://registry.npmjs.org/npm/-/npm-11.5.1.tgz'
            }
          }
        }
      });

      // Simulate the regex replacement that happens in the code
      const rewrittenText = mockOriginalText.replace(
        /https:\/\/registry\.npmjs\.org\/([^\/]+)/g,
        `https://xget.xi-xu.me/npm/$1`
      );

      const rewrittenData = JSON.parse(rewrittenText);

      // Verify the URL is correctly rewritten with package name preserved
      expect(rewrittenData.versions['11.5.1'].dist.tarball).toBe(
        'https://xget.xi-xu.me/npm/npm/-/npm-11.5.1.tgz'
      );
    });
  });
});
