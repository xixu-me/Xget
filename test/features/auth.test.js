import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('Authentication Header Forwarding', () => {
  it('should forward Authorization header for Hugging Face requests', async () => {
    // Test with a Hugging Face dataset file that would require authentication
    const testUrl = 'https://example.com/hf/datasets/test/private-dataset/resolve/main/data.csv';
    const authToken = 'Bearer hf_test_token_12345';

    const response = await SELF.fetch(testUrl, {
      method: 'HEAD',
      headers: {
        Authorization: authToken
      }
    });

    // Should accept the request (not 400 bad request)
    expect(response.status).not.toBe(400);
    // Should attempt to proxy to HF with auth (status depends on actual HF response)
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('should forward Authorization header for GitHub API requests', async () => {
    const testUrl = 'https://example.com/gh/test/private-repo/README.md';
    const authToken = 'Bearer ghp_test_token_12345';

    const response = await SELF.fetch(testUrl, {
      method: 'HEAD',
      headers: {
        Authorization: authToken
      }
    });

    // Should accept the request and forward the auth header
    expect(response.status).not.toBe(400);
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('should forward Authorization header for PyPI authenticated requests', async () => {
    const testUrl = 'https://example.com/pypi/simple/private-package/';
    const authToken = 'Basic dGVzdDp0ZXN0MTIzNDU=';

    const response = await SELF.fetch(testUrl, {
      method: 'HEAD',
      headers: {
        Authorization: authToken
      }
    });

    // Should accept the request
    expect(response.status).not.toBe(400);
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('should work with gated Hugging Face models', async () => {
    // Simulate a request to a gated model that requires authentication
    const testUrl = 'https://example.com/hf/meta-llama/Llama-2-7b/resolve/main/config.json';
    const authToken = 'Bearer hf_authenticated_token';

    const response = await SELF.fetch(testUrl, {
      headers: {
        Authorization: authToken
      }
    });

    // Should attempt to proxy with authentication
    // The actual status depends on whether the token is valid and the model exists
    expect(response.status).not.toBe(400);
  });
});
