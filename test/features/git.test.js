import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('Git Protocol Integration', () => {
  it('should handle Git info/refs requests', async () => {
    const testUrl = 'https://example.com/gh/microsoft/vscode.git/info/refs?service=git-upload-pack';
    const response = await SELF.fetch(testUrl, {
      headers: {
        'User-Agent': 'git/2.34.1'
      }
    });

    expect([200, 301, 302, 404]).toContain(response.status);
  });

  it('should handle Git upload-pack requests', async () => {
    const testUrl = 'https://example.com/gh/microsoft/vscode.git/git-upload-pack';
    const response = await SELF.fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-git-upload-pack-request',
        'User-Agent': 'git/2.34.1'
      },
      body: '0000' // Minimal Git protocol data
    });

    expect([200, 301, 302, 400, 404]).toContain(response.status);
  });

  it('should preserve Git-specific headers', async () => {
    const testUrl = 'https://example.com/gh/test/repo.git/info/refs';
    const response = await SELF.fetch(testUrl, {
      headers: {
        'User-Agent': 'git/2.34.1',
        'Git-Protocol': 'version=2'
      }
    });

    // Should not reject Git-specific headers
    expect(response.status).not.toBe(400);
  });
});
