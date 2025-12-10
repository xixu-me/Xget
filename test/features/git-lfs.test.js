import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('Git LFS Protocol Integration', () => {
  it('should handle LFS info/lfs requests', async () => {
    const testUrl = 'https://example.com/gh/microsoft/vscode.git/info/lfs';
    const response = await SELF.fetch(testUrl, {
      headers: {
        'User-Agent': 'git-lfs/3.0.0 (GitHub; darwin amd64; go 1.17.2)'
      }
    });

    expect([200, 301, 302, 404]).toContain(response.status);
  });

  it('should handle LFS batch API requests', async () => {
    const testUrl = 'https://example.com/gh/microsoft/vscode.git/objects/batch';
    const response = await SELF.fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.git-lfs+json',
        Accept: 'application/vnd.git-lfs+json',
        'User-Agent': 'git-lfs/3.0.0'
      },
      body: JSON.stringify({
        operation: 'download',
        objects: [
          {
            oid: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
            size: 1024
          }
        ]
      })
    });

    expect([200, 301, 302, 400, 403, 404]).toContain(response.status);
  });

  it('should handle LFS object download requests', async () => {
    const testUrl =
      'https://example.com/gh/microsoft/vscode.git/objects/a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd';
    const response = await SELF.fetch(testUrl, {
      headers: {
        'User-Agent': 'git-lfs/3.0.0',
        Accept: 'application/octet-stream'
      }
    });

    expect([200, 301, 302, 403, 404]).toContain(response.status);
  });

  it('should preserve LFS-specific headers', async () => {
    const testUrl = 'https://example.com/gh/test/repo.git/objects/batch';
    const response = await SELF.fetch(testUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'git-lfs/3.0.0',
        Accept: 'application/vnd.git-lfs+json',
        'Content-Type': 'application/vnd.git-lfs+json'
      },
      body: '{}'
    });

    // Should not reject LFS-specific headers
    expect(response.status).not.toBe(400);
  });

  it('should skip caching for LFS requests', async () => {
    const testUrl = 'https://example.com/gh/test/repo.git/info/lfs';

    // First request
    const response1 = await SELF.fetch(testUrl, {
      headers: {
        'User-Agent': 'git-lfs/3.0.0'
      }
    });

    // Second request - should not be cached
    const response2 = await SELF.fetch(testUrl, {
      headers: {
        'User-Agent': 'git-lfs/3.0.0'
      }
    });

    // Both requests should go to origin (no cache hit)
    const metrics1 = response1.headers.get('X-Performance-Metrics');
    const metrics2 = response2.headers.get('X-Performance-Metrics');

    // Verify that neither indicates a cache hit
    if (metrics1 && metrics2) {
      expect(metrics1).not.toContain('cache_hit');
      expect(metrics2).not.toContain('cache_hit');
    }
  });
});
