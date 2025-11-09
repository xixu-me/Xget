import { describe, expect, it } from 'vitest';

// Mock utility functions for testing
// These would normally be imported from actual utility modules

function isGitRequest(request, url) {
  // Check for Git-specific endpoints
  if (url.pathname.endsWith('/info/refs')) {
    return true;
  }

  if (url.pathname.endsWith('/git-upload-pack') || url.pathname.endsWith('/git-receive-pack')) {
    return true;
  }

  // Check for Git user agents
  const userAgent = request.headers.get('User-Agent') || '';
  if (userAgent.includes('git/') || userAgent.startsWith('git/')) {
    return true;
  }

  // Check for Git-specific query parameters
  if (url.searchParams.has('service')) {
    const service = url.searchParams.get('service');
    return service === 'git-upload-pack' || service === 'git-receive-pack';
  }

  // Check for Git-specific content types
  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.includes('git-upload-pack') || contentType.includes('git-receive-pack')) {
    return true;
  }

  return false;
}

function isGitLFSRequest(request, url) {
  // Check for LFS-specific endpoints
  if (url.pathname.includes('/info/lfs')) {
    return true;
  }

  if (url.pathname.includes('/objects/batch')) {
    return true;
  }

  // Check for LFS object storage endpoints (SHA-256 hash is 64 hex characters)
  if (url.pathname.match(/\/objects\/[a-fA-F0-9]{64}$/)) {
    return true;
  }

  // Check for LFS-specific headers
  const accept = request.headers.get('Accept') || '';
  const contentType = request.headers.get('Content-Type') || '';
  
  if (accept.includes('application/vnd.git-lfs') || 
      contentType.includes('application/vnd.git-lfs')) {
    return true;
  }

  // Check for LFS user agent
  const userAgent = request.headers.get('User-Agent') || '';
  if (userAgent.includes('git-lfs')) {
    return true;
  }

  return false;
}

function validateRequest(request, url) {
  const CONFIG = {
    SECURITY: {
      ALLOWED_METHODS: ['GET', 'HEAD'],
      MAX_PATH_LENGTH: 2048
    }
  };

  // Allow POST method for Git operations
  const allowedMethods = isGitRequest(request, url)
    ? ['GET', 'HEAD', 'POST']
    : CONFIG.SECURITY.ALLOWED_METHODS;

  if (!allowedMethods.includes(request.method)) {
    return { valid: false, error: 'Method not allowed', status: 405 };
  }

  if (url.pathname.length > CONFIG.SECURITY.MAX_PATH_LENGTH) {
    return { valid: false, error: 'Path too long', status: 414 };
  }

  return { valid: true };
}

function addSecurityHeaders(headers) {
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; script-src 'none'");
  headers.set('Permissions-Policy', 'interest-cohort=()');
  return headers;
}

describe('Utility Functions', () => {
  describe('isGitRequest', () => {
    it('should identify Git info/refs requests', () => {
      const request = new Request('https://example.com/repo.git/info/refs');
      const url = new URL(request.url);

      expect(isGitRequest(request, url)).toBe(true);
    });

    it('should identify Git upload-pack requests', () => {
      const request = new Request('https://example.com/repo.git/git-upload-pack');
      const url = new URL(request.url);

      expect(isGitRequest(request, url)).toBe(true);
    });

    it('should identify Git receive-pack requests', () => {
      const request = new Request('https://example.com/repo.git/git-receive-pack');
      const url = new URL(request.url);

      expect(isGitRequest(request, url)).toBe(true);
    });

    it('should identify Git requests by User-Agent', () => {
      const request = new Request('https://example.com/repo.git', {
        headers: { 'User-Agent': 'git/2.34.1' }
      });
      const url = new URL(request.url);

      expect(isGitRequest(request, url)).toBe(true);
    });

    it('should identify Git requests by service parameter', () => {
      const request = new Request('https://example.com/repo.git/info/refs?service=git-upload-pack');
      const url = new URL(request.url);

      expect(isGitRequest(request, url)).toBe(true);
    });

    it('should identify Git requests by content type', () => {
      const request = new Request('https://example.com/repo.git/git-upload-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-git-upload-pack-request' }
      });
      const url = new URL(request.url);

      expect(isGitRequest(request, url)).toBe(true);
    });

    it('should not identify regular file requests as Git', () => {
      const request = new Request('https://example.com/repo/file.txt');
      const url = new URL(request.url);

      expect(isGitRequest(request, url)).toBe(false);
    });

    it('should handle edge cases gracefully', () => {
      const request = new Request('https://example.com/');
      const url = new URL(request.url);

      expect(isGitRequest(request, url)).toBe(false);
    });
  });

  describe('isGitLFSRequest', () => {
    it('should identify LFS info/lfs requests', () => {
      const request = new Request('https://example.com/repo.git/info/lfs');
      const url = new URL(request.url);

      expect(isGitLFSRequest(request, url)).toBe(true);
    });

    it('should identify LFS batch API requests', () => {
      const request = new Request('https://example.com/repo.git/objects/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.git-lfs+json' }
      });
      const url = new URL(request.url);

      expect(isGitLFSRequest(request, url)).toBe(true);
    });

    it('should identify LFS object storage requests by path', () => {
      const request = new Request('https://example.com/repo.git/objects/a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd');
      const url = new URL(request.url);

      expect(isGitLFSRequest(request, url)).toBe(true);
    });

    it('should identify LFS requests by Accept header', () => {
      const request = new Request('https://example.com/repo.git/objects/batch', {
        headers: { 'Accept': 'application/vnd.git-lfs+json' }
      });
      const url = new URL(request.url);

      expect(isGitLFSRequest(request, url)).toBe(true);
    });

    it('should identify LFS requests by Content-Type header', () => {
      const request = new Request('https://example.com/repo.git/objects/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.git-lfs+json' }
      });
      const url = new URL(request.url);

      expect(isGitLFSRequest(request, url)).toBe(true);
    });

    it('should identify LFS requests by User-Agent', () => {
      const request = new Request('https://example.com/repo.git', {
        headers: { 'User-Agent': 'git-lfs/3.0.0 (GitHub; darwin amd64; go 1.17.2)' }
      });
      const url = new URL(request.url);

      expect(isGitLFSRequest(request, url)).toBe(true);
    });

    it('should not identify regular file requests as LFS', () => {
      const request = new Request('https://example.com/repo/file.txt');
      const url = new URL(request.url);

      expect(isGitLFSRequest(request, url)).toBe(false);
    });

    it('should not identify standard Git requests as LFS', () => {
      const request = new Request('https://example.com/repo.git/info/refs');
      const url = new URL(request.url);

      expect(isGitLFSRequest(request, url)).toBe(false);
    });

    it('should handle edge cases gracefully', () => {
      const request = new Request('https://example.com/');
      const url = new URL(request.url);

      expect(isGitLFSRequest(request, url)).toBe(false);
    });
  });

  describe('validateRequest', () => {
    it('should allow GET requests', () => {
      const request = new Request('https://example.com/test', { method: 'GET' });
      const url = new URL(request.url);

      const result = validateRequest(request, url);
      expect(result.valid).toBe(true);
    });

    it('should allow HEAD requests', () => {
      const request = new Request('https://example.com/test', { method: 'HEAD' });
      const url = new URL(request.url);

      const result = validateRequest(request, url);
      expect(result.valid).toBe(true);
    });

    it('should reject PUT requests for non-Git operations', () => {
      const request = new Request('https://example.com/test', { method: 'PUT' });
      const url = new URL(request.url);

      const result = validateRequest(request, url);
      expect(result.valid).toBe(false);
      expect(result.status).toBe(405);
    });

    it('should allow POST requests for Git operations', () => {
      const request = new Request('https://example.com/repo.git/git-upload-pack', {
        method: 'POST',
        headers: { 'User-Agent': 'git/2.34.1' }
      });
      const url = new URL(request.url);

      const result = validateRequest(request, url);
      expect(result.valid).toBe(true);
    });

    it('should reject extremely long paths', () => {
      const longPath = '/' + 'a'.repeat(3000);
      const request = new Request(`https://example.com${longPath}`);
      const url = new URL(request.url);

      const result = validateRequest(request, url);
      expect(result.valid).toBe(false);
      expect(result.status).toBe(414);
    });

    it('should accept normal length paths', () => {
      const normalPath = '/gh/microsoft/vscode/archive/refs/heads/main.zip';
      const request = new Request(`https://example.com${normalPath}`);
      const url = new URL(request.url);

      const result = validateRequest(request, url);
      expect(result.valid).toBe(true);
    });
  });

  describe('addSecurityHeaders', () => {
    it('should add all required security headers', () => {
      const headers = new Headers();
      const result = addSecurityHeaders(headers);

      expect(result.get('Strict-Transport-Security')).toBeTruthy();
      expect(result.get('X-Frame-Options')).toBe('DENY');
      expect(result.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(result.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(result.get('Content-Security-Policy')).toBeTruthy();
      expect(result.get('Permissions-Policy')).toBeTruthy();
    });

    it('should set HSTS with proper directives', () => {
      const headers = new Headers();
      const result = addSecurityHeaders(headers);

      const hsts = result.get('Strict-Transport-Security');
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('should set CSP with restrictive policy', () => {
      const headers = new Headers();
      const result = addSecurityHeaders(headers);

      const csp = result.get('Content-Security-Policy');
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("script-src 'none'");
    });

    it('should not overwrite existing headers', () => {
      const headers = new Headers();
      headers.set('X-Custom-Header', 'custom-value');

      const result = addSecurityHeaders(headers);

      expect(result.get('X-Custom-Header')).toBe('custom-value');
      expect(result.get('X-Frame-Options')).toBe('DENY');
    });

    it('should return the same Headers object', () => {
      const headers = new Headers();
      const result = addSecurityHeaders(headers);

      expect(result).toBe(headers);
    });
  });

  describe('URL and Path Utilities', () => {
    it('should handle URL parsing correctly', () => {
      const testUrls = [
        'https://example.com/gh/user/repo/file.txt',
        'https://example.com/gl/group/project/-/blob/main/README.md',
        'https://example.com/hf/microsoft/model/resolve/main/config.json'
      ];

      testUrls.forEach(urlString => {
        expect(() => new URL(urlString)).not.toThrow();

        const url = new URL(urlString);
        expect(url.protocol).toBe('https:');
        expect(url.hostname).toBe('example.com');
        expect(url.pathname).toBeTruthy();
      });
    });

    it('should handle query parameters correctly', () => {
      const url = new URL('https://example.com/gh/repo?ref=main&path=src');

      expect(url.searchParams.get('ref')).toBe('main');
      expect(url.searchParams.get('path')).toBe('src');
      expect(url.searchParams.has('nonexistent')).toBe(false);
    });

    it('should handle URL fragments correctly', () => {
      const url = new URL('https://example.com/gh/repo/README.md#section');

      expect(url.hash).toBe('#section');
      expect(url.pathname).toBe('/gh/repo/README.md');
    });
  });

  describe('Request and Response Utilities', () => {
    it('should create requests with proper headers', () => {
      const request = new Request('https://example.com/test', {
        method: 'GET',
        headers: {
          'User-Agent': 'Xget/1.0',
          Accept: 'application/json'
        }
      });

      expect(request.method).toBe('GET');
      expect(request.headers.get('User-Agent')).toBe('Xget/1.0');
      expect(request.headers.get('Accept')).toBe('application/json');
    });

    it('should handle request cloning', () => {
      const originalRequest = new Request('https://example.com/test', {
        method: 'POST',
        body: 'test data',
        headers: { 'Content-Type': 'text/plain' }
      });

      const clonedRequest = originalRequest.clone();

      expect(clonedRequest.method).toBe(originalRequest.method);
      expect(clonedRequest.url).toBe(originalRequest.url);
      expect(clonedRequest.headers.get('Content-Type')).toBe('text/plain');
    });

    it('should create responses with proper status codes', () => {
      const responses = [
        new Response('OK', { status: 200 }),
        new Response('Not Found', { status: 404 }),
        new Response('Server Error', { status: 500 })
      ];

      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(404);
      expect(responses[2].status).toBe(500);
    });
  });

  describe('Error Handling Utilities', () => {
    it('should create proper error responses', () => {
      const errorResponse = new Response('Bad Request', {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'text/plain' }
      });

      expect(errorResponse.status).toBe(400);
      expect(errorResponse.statusText).toBe('Bad Request');
      expect(errorResponse.headers.get('Content-Type')).toBe('text/plain');
    });

    it('should handle async error scenarios', async () => {
      const asyncFunction = async () => {
        throw new Error('Test error');
      };

      await expect(asyncFunction()).rejects.toThrow('Test error');
    });
  });
});
