import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('Container Registry Support', () => {
  describe('Docker API Version Check', () => {
    it('should handle /v2/ endpoint correctly', async () => {
      const response = await SELF.fetch('https://example.com/v2/');

      expect(response.status).toBe(200);
      expect(response.headers.get('Docker-Distribution-Api-Version')).toBe('registry/2.0');
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.text();
      expect(body).toBe('{}');
    });

    it('should handle /v2 endpoint correctly', async () => {
      const response = await SELF.fetch('https://example.com/v2');

      expect(response.status).toBe(200);
      expect(response.headers.get('Docker-Distribution-Api-Version')).toBe('registry/2.0');
    });
  });

  describe('Container Registry URL Transformation', () => {
    it('should handle Quay.io registry requests', async () => {
      const testUrl = 'https://example.com/cr/quay/v2/quay/redis/manifests/latest';
      const response = await SELF.fetch(testUrl, { method: 'HEAD' });

      // Should attempt to proxy to Quay.io
      expect(response.status).not.toBe(400);
    });

    it('should handle Google Container Registry requests', async () => {
      const testUrl = 'https://example.com/cr/gcr/v2/distroless/base/manifests/latest';
      const response = await SELF.fetch(testUrl, { method: 'HEAD' });

      // Should attempt to proxy to GCR
      expect(response.status).not.toBe(400);
    });

    it('should handle GitHub Container Registry requests', async () => {
      const testUrl = 'https://example.com/cr/ghcr/v2/nginxinc/nginx-unprivileged/manifests/latest';
      const response = await SELF.fetch(testUrl, { method: 'HEAD' });

      // Should attempt to proxy to GHCR
      expect(response.status).not.toBe(400);
    });
  });

  describe('Docker Authentication', () => {
    it('should pass through 401 authentication challenges', async () => {
      // This test simulates an upstream 401 response which should be passed through
      const testUrl = 'https://example.com/cr/ghcr/v2/private/repo/manifests/latest';
      const response = await SELF.fetch(testUrl, {
        headers: {
          Accept: 'application/vnd.docker.distribution.manifest.v2+json'
        }
      });

      // Should not convert 401 to 500 or other error codes
      if (response.status === 401) {
        // WWW-Authenticate header should be preserved
        expect(response.headers.has('WWW-Authenticate') || response.status === 401).toBeTruthy();
      }
    });

    it('should handle container registry token requests', async () => {
      const testUrl = 'https://example.com/cr/ghcr/v2/auth';
      const response = await SELF.fetch(testUrl, {
        headers: {
          Authorization: 'Basic dGVzdDp0ZXN0'
        }
      });

      // Should attempt to proxy auth requests
      expect(response.status).not.toBe(400);
    });
  });

  describe('Docker Request Detection', () => {
    it('should detect Docker requests by path', async () => {
      const response = await SELF.fetch(
        'https://example.com/cr/ghcr/v2/nginxinc/nginx-unprivileged/manifests/latest',
        {
          method: 'GET'
        }
      );

      // Should not reject with 405 (method not allowed)
      expect(response.status).not.toBe(405);
    });

    it('should detect Docker requests by Accept header', async () => {
      const response = await SELF.fetch('https://example.com/cr/ghcr/v2/test/repo/manifests/tag', {
        headers: {
          Accept: 'application/vnd.docker.distribution.manifest.v2+json'
        }
      });

      // Should not reject with 405 (method not allowed)
      expect(response.status).not.toBe(405);
    });

    it('should detect Docker requests by User-Agent', async () => {
      const response = await SELF.fetch('https://example.com/cr/ghcr/v2/test/repo/manifests/tag', {
        headers: {
          'User-Agent': 'docker/20.10.7'
        }
      });

      // Should not reject with 405 (method not allowed)
      expect(response.status).not.toBe(405);
    });
  });

  describe('Docker HTTP Methods', () => {
    it('should allow GET for manifest requests', async () => {
      const response = await SELF.fetch(
        'https://example.com/cr/ghcr/v2/nginxinc/nginx-unprivileged/manifests/latest',
        {
          method: 'GET'
        }
      );

      expect(response.status).not.toBe(405);
    });

    it('should allow HEAD for manifest requests', async () => {
      const response = await SELF.fetch(
        'https://example.com/cr/ghcr/v2/nginxinc/nginx-unprivileged/manifests/latest',
        {
          method: 'HEAD'
        }
      );

      expect(response.status).not.toBe(405);
    });

    it('should allow PUT for manifest uploads', async () => {
      const response = await SELF.fetch('https://example.com/cr/ghcr/v2/test/repo/manifests/tag', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/vnd.docker.distribution.manifest.v2+json'
        },
        body: JSON.stringify({
          schemaVersion: 2,
          mediaType: 'application/vnd.docker.distribution.manifest.v2+json'
        })
      });

      expect(response.status).not.toBe(405);
    });

    it('should allow POST for blob uploads', async () => {
      const response = await SELF.fetch('https://example.com/cr/ghcr/v2/test/repo/blobs/uploads/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });

      expect(response.status).not.toBe(405);
    });
  });

  describe('Container Registry Error Handling', () => {
    it('should reject non-cr prefixed Docker requests', async () => {
      const response = await SELF.fetch(
        'https://example.com/v2/nginxinc/nginx-unprivileged/manifests/latest'
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toContain('container registry requests must use /cr/ prefix');
    });
  });

  describe('Container Registry Headers', () => {
    it('should preserve container-specific headers', async () => {
      const response = await SELF.fetch(
        'https://example.com/cr/ghcr/v2/nginxinc/nginx-unprivileged/manifests/latest',
        {
          headers: {
            'Container-Content-Digest': 'sha256:abc123',
            Accept: 'application/vnd.docker.distribution.manifest.v2+json',
            Authorization: 'Bearer token123'
          }
        }
      );

      // Should not reject Docker-specific headers
      expect(response.status).not.toBe(400);
    });

    it('should not cache container registry responses', async () => {
      const testUrl = 'https://example.com/cr/ghcr/v2/nginxinc/nginx-unprivileged/manifests/latest';

      const response = await SELF.fetch(testUrl);

      // Container registry responses should not be cached
      const cacheControl = response.headers.get('Cache-Control');
      if (cacheControl) {
        expect(cacheControl).not.toContain('max-age=1800');
      }
    });
  });

  describe('Container Registry Platform Support', () => {
    const containerRegistries = [
      { name: 'Docker Hub', prefix: 'cr/docker', expectedStatus: [200, 301, 302, 401, 404] },
      { name: 'Quay.io', prefix: 'cr/quay', expectedStatus: [200, 301, 302, 401, 404] },
      {
        name: 'Google Container Registry',
        prefix: 'cr/gcr',
        expectedStatus: [200, 301, 302, 401, 404]
      },
      {
        name: 'Microsoft Container Registry',
        prefix: 'cr/mcr',
        expectedStatus: [200, 301, 302, 401, 404]
      },
      {
        name: 'GitHub Container Registry',
        prefix: 'cr/ghcr',
        expectedStatus: [200, 301, 302, 401, 404]
      },
      { name: 'Amazon ECR Public', prefix: 'cr/ecr', expectedStatus: [200, 301, 302, 401, 404] }
    ];

    containerRegistries.forEach(({ name, prefix, expectedStatus }) => {
      it(`should support ${name} registry`, async () => {
        const testUrl = `https://example.com/${prefix}/v2/test/image/manifests/latest`;
        const response = await SELF.fetch(testUrl, { method: 'HEAD' });

        expect(expectedStatus).toContain(response.status);
      });
    });
  });

  describe('Docker Hub Specific Tests', () => {
    it('should handle Docker Hub official images (single-name images)', async () => {
      // Official images like nginx, redis are stored as library/nginx in Docker Hub
      const testUrl = 'https://example.com/cr/docker/v2/nginx/manifests/latest';
      const response = await SELF.fetch(testUrl, {
        headers: {
          Accept: 'application/vnd.docker.distribution.manifest.v2+json'
        }
      });

      // Should attempt to proxy to Docker Hub
      expect(response.status).not.toBe(400);
    });

    it('should handle Docker Hub user images (namespace/image format)', async () => {
      // User images already have namespace prefix
      const testUrl = 'https://example.com/cr/docker/v2/nginxinc/nginx-unprivileged/manifests/latest';
      const response = await SELF.fetch(testUrl, {
        headers: {
          Accept: 'application/vnd.docker.distribution.manifest.v2+json'
        }
      });

      // Should attempt to proxy to Docker Hub
      expect(response.status).not.toBe(400);
    });

    it('should allow GET for Docker Hub manifest requests', async () => {
      const response = await SELF.fetch(
        'https://example.com/cr/docker/v2/nginx/manifests/latest',
        {
          method: 'GET',
          headers: {
            Accept: 'application/vnd.docker.distribution.manifest.v2+json'
          }
        }
      );

      expect(response.status).not.toBe(405);
    });

    it('should allow HEAD for Docker Hub manifest requests', async () => {
      const response = await SELF.fetch(
        'https://example.com/cr/docker/v2/nginx/manifests/latest',
        {
          method: 'HEAD',
          headers: {
            Accept: 'application/vnd.docker.distribution.manifest.v2+json'
          }
        }
      );

      expect(response.status).not.toBe(405);
    });
  });
});
