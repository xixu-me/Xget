/**
 * Mock creation utilities for tests
 */

/**
 * Create a mock request with default options
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @returns {Request} Mock request object
 */
export function createMockRequest(url, options = {}) {
  const defaultOptions = {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Test)',
      Accept: '*/*'
    }
  };

  return new Request(url, { ...defaultOptions, ...options });
}

/**
 * Create a mock response with default options
 * @param {string} body - Response body
 * @param {Object} options - Response options
 * @returns {Response} Mock response object
 */
export function createMockResponse(body = 'OK', options = {}) {
  const defaultOptions = {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'text/plain'
    }
  };

  return new Response(body, { ...defaultOptions, ...options });
}

/**
 * Create a Git request for testing
 * @param {string} url - Git repository URL
 * @param {string} service - Git service (upload-pack or receive-pack)
 * @returns {Request} Git request object
 */
export function createGitRequest(url, service = 'git-upload-pack') {
  const gitUrl = url.includes('?') ? `${url}&service=${service}` : `${url}?service=${service}`;

  return new Request(gitUrl, {
    method: service === 'git-upload-pack' ? 'GET' : 'POST',
    headers: {
      'User-Agent': 'git/2.34.1',
      'Git-Protocol': 'version=2',
      ...(service !== 'git-upload-pack' && {
        'Content-Type': `application/x-${service}-request`
      })
    }
  });
}

/**
 * Create a Docker request for testing
 * @param {string} url - Docker registry URL
 * @param {Object} options - Request options
 * @returns {Request} Docker request object
 */
export function createDockerRequest(url, options = {}) {
  return new Request(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'docker/24.0.0',
      Accept: 'application/vnd.docker.distribution.manifest.v2+json',
      ...options.headers
    },
    ...options
  });
}

/**
 * Mock fetch function for testing
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Mock response
 */
export function mockFetch(url, options = {}) {
  return new Promise(resolve => {
    setTimeout(() => {
      if (url.includes('error')) {
        resolve(createMockResponse('Server Error', { status: 500 }));
      } else if (url.includes('notfound')) {
        resolve(createMockResponse('Not Found', { status: 404 }));
      } else {
        resolve(createMockResponse('Mock Response', { status: 200 }));
      }
    }, 10);
  });
}

/**
 * Create a mock npm registry response
 * @param {string} packageName - Package name
 * @param {string} version - Package version
 * @returns {Object} Mock npm registry response
 */
export function createMockNpmRegistryResponse(packageName, version = '1.0.0') {
  return {
    name: packageName,
    versions: {
      [version]: {
        name: packageName,
        version,
        dist: {
          tarball: `https://registry.npmjs.org/${packageName}/-/${packageName}-${version}.tgz`,
          shasum: 'mock-shasum',
          integrity: 'mock-integrity'
        }
      }
    },
    'dist-tags': {
      latest: version
    }
  };
}
