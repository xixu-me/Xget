import { CONFIG, createConfig } from './config/index.js';
import { transformPath } from './config/platforms.js';

/**
 * Monitors performance metrics during request processing
 */
class PerformanceMonitor {
  /**
   * Initializes a new performance monitor
   */
  constructor() {
    this.startTime = Date.now();
    this.marks = new Map();
  }

  /**
   * Marks a timing point with the given name
   * @param {string} name - The name of the timing mark
   */
  mark(name) {
    if (this.marks.has(name)) {
      console.warn(`Mark with name ${name} already exists.`);
    }
    this.marks.set(name, Date.now() - this.startTime);
  }

  /**
   * Returns all collected metrics
   * @returns {Object.<string, number>} Object containing name-timestamp pairs
   */
  getMetrics() {
    return Object.fromEntries(this.marks.entries());
  }
}

/**
 * Detects if a request is a container registry operation
 * @param {Request} request - The incoming request object
 * @param {URL} url - Parsed URL object
 * @returns {boolean} True if this is a container registry operation
 */
function isDockerRequest(request, url) {
  // Check for container registry API endpoints
  if (url.pathname.startsWith('/v2/')) {
    return true;
  }

  // Check for Docker-specific User-Agent
  const userAgent = request.headers.get('User-Agent') || '';
  if (userAgent.toLowerCase().includes('docker/')) {
    return true;
  }

  // Check for Docker-specific Accept headers
  const accept = request.headers.get('Accept') || '';
  if (
    accept.includes('application/vnd.docker.distribution.manifest') ||
    accept.includes('application/vnd.oci.image.manifest') ||
    accept.includes('application/vnd.docker.image.rootfs.diff.tar.gzip')
  ) {
    return true;
  }

  return false;
}

/**
 * Detects if a request is a Git operation
 * @param {Request} request - The incoming request object
 * @param {URL} url - Parsed URL object
 * @returns {boolean} True if this is a Git operation
 */
function isGitRequest(request, url) {
  // Check for Git-specific endpoints
  if (url.pathname.endsWith('/info/refs')) {
    return true;
  }

  if (url.pathname.endsWith('/git-upload-pack') || url.pathname.endsWith('/git-receive-pack')) {
    return true;
  }

  // Check for Git user agents (more comprehensive check)
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

/**
 * Check if the request is a Git LFS operation
 * @param {Request} request - The incoming request object
 * @param {URL} url - Parsed URL object
 * @returns {boolean} True if this is a Git LFS operation
 */
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

/**
 * Check if the request is for an AI inference provider
 * @param {Request} request - The incoming request object
 * @param {URL} url - Parsed URL object
 * @returns {boolean} True if this is an AI inference request
 */
function isAIInferenceRequest(request, url) {
  // Check for AI inference provider paths (ip/{provider}/...)
  if (url.pathname.startsWith('/ip/')) {
    return true;
  }

  // Check for common AI inference API endpoints
  const aiEndpoints = [
    '/v1/chat/completions',
    '/v1/completions',
    '/v1/messages',
    '/v1/predictions',
    '/v1/generate',
    '/v1/embeddings',
    '/openai/v1/chat/completions'
  ];

  if (aiEndpoints.some(endpoint => url.pathname.includes(endpoint))) {
    return true;
  }

  // Check for AI-specific content types
  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.includes('application/json') && request.method === 'POST') {
    // Additional check for common AI inference patterns in URL
    if (
      url.pathname.includes('/chat/') ||
      url.pathname.includes('/completions') ||
      url.pathname.includes('/generate') ||
      url.pathname.includes('/predict')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Validates incoming requests against security rules
 * @param {Request} request - The incoming request object
 * @param {URL} url - Parsed URL object
 * @param {import('./config/index.js').ApplicationConfig} config - Configuration object
 * @returns {{valid: boolean, error?: string, status?: number}} Validation result
 */
function validateRequest(request, url, config = CONFIG) {
  // Allow POST method for Git, Git LFS, Docker, and AI inference operations
  const isGit = isGitRequest(request, url);
  const isGitLFS = isGitLFSRequest(request, url);
  const isDocker = isDockerRequest(request, url);
  const isAI = isAIInferenceRequest(request, url);

  const allowedMethods =
    isGit || isGitLFS || isDocker || isAI
      ? ['GET', 'HEAD', 'POST', 'PUT', 'PATCH']
      : config.SECURITY.ALLOWED_METHODS;

  if (!allowedMethods.includes(request.method)) {
    return { valid: false, error: 'Method not allowed', status: 405 };
  }

  if (url.pathname.length > config.SECURITY.MAX_PATH_LENGTH) {
    return { valid: false, error: 'Path too long', status: 414 };
  }

  return { valid: true };
}

/**
 * Creates a standardized error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {boolean} includeDetails - Whether to include detailed error information
 * @returns {Response} Error response
 */
function createErrorResponse(message, status, includeDetails = false) {
  const errorBody = includeDetails
    ? JSON.stringify({ error: message, status, timestamp: new Date().toISOString() })
    : message;

  return new Response(errorBody, {
    status,
    headers: addSecurityHeaders(
      new Headers({
        'Content-Type': includeDetails ? 'application/json' : 'text/plain'
      })
    )
  });
}

/**
 * Adds security headers to the response
 * @param {Headers} headers - Headers object to modify
 * @returns {Headers} Modified headers object
 */
function addSecurityHeaders(headers) {
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; script-src 'none'");
  headers.set('Permissions-Policy', 'interest-cohort=()');
  return headers;
}

/**
 * Parses Docker WWW-Authenticate header
 * @param {string} authenticateStr - The WWW-Authenticate header value
 * @returns {{realm: string, service: string}} Parsed authentication info
 */
function parseAuthenticate(authenticateStr) {
  // sample: Bearer realm="https://auth.ipv6.docker.com/token",service="registry.docker.io"
  const re = /(?<=\=")(?:\\.|[^"\\])*(?=")/g;
  const matches = authenticateStr.match(re);
  if (matches == null || matches.length < 2) {
    throw new Error(`invalid Www-Authenticate Header: ${authenticateStr}`);
  }
  return {
    realm: matches[0],
    service: matches[1]
  };
}

/**
 * Fetches authentication token from container registry
 * @param {{realm: string, service: string}} wwwAuthenticate - Authentication info
 * @param {string} scope - The scope for the token
 * @param {string} authorization - Authorization header value
 * @returns {Promise<Response>} Token response
 */
async function fetchToken(wwwAuthenticate, scope, authorization) {
  const url = new URL(wwwAuthenticate.realm);
  if (wwwAuthenticate.service.length) {
    url.searchParams.set('service', wwwAuthenticate.service);
  }
  if (scope) {
    url.searchParams.set('scope', scope);
  }
  const headers = new Headers();
  if (authorization) {
    headers.set('Authorization', authorization);
  }
  return await fetch(url, { method: 'GET', headers });
}

/**
 * Creates unauthorized response for container registry
 * @param {URL} url - Request URL
 * @returns {Response} Unauthorized response
 */
function responseUnauthorized(url) {
  const headers = new Headers();
  headers.set('WWW-Authenticate', `Bearer realm="https://${url.hostname}/v2/auth",service="Xget"`);
  return new Response(JSON.stringify({ message: 'UNAUTHORIZED' }), {
    status: 401,
    headers
  });
}

/**
 * Handles incoming requests with caching, retries, and security measures
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {ExecutionContext} ctx - Cloudflare Workers execution context
 * @returns {Promise<Response>} The response object
 */
async function handleRequest(request, env, ctx) {
  try {
    // Create config with environment variable overrides
    const config = env ? createConfig(env) : CONFIG;
    const url = new URL(request.url);
    const isDocker = isDockerRequest(request, url);

    const monitor = new PerformanceMonitor();

    // Handle Docker API version check
    if (isDocker && (url.pathname === '/v2/' || url.pathname === '/v2')) {
      const headers = new Headers({
        'Docker-Distribution-Api-Version': 'registry/2.0',
        'Content-Type': 'application/json'
      });
      addSecurityHeaders(headers);
      return new Response('{}', { status: 200, headers });
    }

    // Redirect root path or invalid platforms to GitHub repository
    if (url.pathname === '/' || url.pathname === '') {
      const HOME_PAGE_URL = 'https://github.com/xixu-me/Xget';
      return Response.redirect(HOME_PAGE_URL, 302);
    }

    const validation = validateRequest(request, url, config);
    if (!validation.valid) {
      return createErrorResponse(validation.error || 'Validation failed', validation.status || 400);
    }

    // Parse platform and path
    let platform;
    let effectivePath = url.pathname;

    // Handle container registry paths specially
    if (isDocker) {
      // For Docker requests (excluding version check which is handled above),
      // check if they have /cr/ prefix
      if (!url.pathname.startsWith('/cr/') && !url.pathname.startsWith('/v2/cr/')) {
        return createErrorResponse('container registry requests must use /cr/ prefix', 400);
      }
      // Remove /v2 from the path for container registry API consistency if present
      effectivePath = url.pathname.replace(/^\/v2/, '');
    }

    // Platform detection using transform patterns
    // Sort platforms by path length (descending) to prioritize more specific paths
    // e.g., conda/community should match before conda, pypi/files before pypi
    const sortedPlatforms = Object.keys(config.PLATFORMS).sort((a, b) => {
      const pathA = `/${a.replace('-', '/')}/`;
      const pathB = `/${b.replace('-', '/')}/`;
      return pathB.length - pathA.length;
    });

    platform =
      sortedPlatforms.find(key => {
        const expectedPrefix = `/${key.replace('-', '/')}/`;
        return effectivePath.startsWith(expectedPrefix);
      }) || effectivePath.split('/')[1];

    if (!platform || !config.PLATFORMS[platform]) {
      const HOME_PAGE_URL = 'https://github.com/xixu-me/Xget';
      return Response.redirect(HOME_PAGE_URL, 302);
    }

    // Transform URL based on platform using unified logic
    const targetPath = transformPath(effectivePath, platform);

    // For container registries, ensure we add the /v2 prefix for the Docker API
    let finalTargetPath;
    if (platform.startsWith('cr-')) {
      finalTargetPath = `/v2${targetPath}`;
    } else {
      finalTargetPath = targetPath;
    }

    const targetUrl = `${config.PLATFORMS[platform]}${finalTargetPath}${url.search}`;
    const authorization = request.headers.get('Authorization');

    // Handle Docker authentication
    if (isDocker && url.pathname === '/v2/auth') {
      const newUrl = new URL(`${config.PLATFORMS[platform]}/v2/`);
      const resp = await fetch(newUrl.toString(), {
        method: 'GET',
        redirect: 'follow'
      });
      if (resp.status !== 401) {
        return resp;
      }
      const authenticateStr = resp.headers.get('WWW-Authenticate');
      if (authenticateStr === null) {
        return resp;
      }
      const wwwAuthenticate = parseAuthenticate(authenticateStr);
      const scope = url.searchParams.get('scope');
      return await fetchToken(wwwAuthenticate, scope || '', authorization || '');
    }

    // Check if this is a Git operation
    const isGit = isGitRequest(request, url);

    // Check if this is a Git LFS operation
    const isGitLFS = isGitLFSRequest(request, url);

    // Check if this is an AI inference request
    const isAI = isAIInferenceRequest(request, url);

    // Check cache first (skip cache for Git, Git LFS, Docker, and AI inference operations)
    /** @type {Cache} */
    // @ts-ignore - Cloudflare Workers cache API
    const cache = caches.default;
    let response;

    if (!isGit && !isGitLFS && !isDocker && !isAI) {
      // For Range requests, try cache match first
      const cacheKey = new Request(targetUrl, request);
      response = await cache.match(cacheKey);
      if (response) {
        monitor.mark('cache_hit');
        return response;
      }

      // If Range request missed cache, try with original request to see if we have full content cached
      const rangeHeader = request.headers.get('Range');
      if (rangeHeader) {
        const fullContentKey = new Request(targetUrl, {
          method: request.method,
          headers: new Headers(
            [...request.headers.entries()].filter(([k]) => k.toLowerCase() !== 'range')
          )
        });
        response = await cache.match(fullContentKey);
        if (response) {
          monitor.mark('cache_hit_full_content');
          return response;
        }
      }
    }

    /** @type {RequestInit} */
    const fetchOptions = {
      method: request.method,
      headers: new Headers(),
      redirect: 'follow'
    };

    // Add body for POST/PUT/PATCH requests (Git/Docker/AI inference operations)
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && (isGit || isGitLFS || isDocker || isAI)) {
      fetchOptions.body = request.body;
    }

    // Cast headers to Headers for proper typing
    const requestHeaders = /** @type {Headers} */ (fetchOptions.headers);

    // Set appropriate headers for Git/Docker/AI vs regular requests
    if (isGit || isGitLFS || isDocker || isAI) {
      // For Git/Docker/AI operations, copy all headers from the original request
      // This ensures protocol compliance
      for (const [key, value] of request.headers.entries()) {
        // Skip headers that might cause issues with proxying
        if (!['host', 'connection', 'upgrade', 'proxy-connection'].includes(key.toLowerCase())) {
          requestHeaders.set(key, value);
        }
      }

      // Set Git-specific headers if not present
      if (isGit && !requestHeaders.has('User-Agent')) {
        requestHeaders.set('User-Agent', 'git/2.34.1');
      }

      // For Git upload-pack requests, ensure proper content type
      if (isGit && request.method === 'POST' && url.pathname.endsWith('/git-upload-pack')) {
        if (!requestHeaders.has('Content-Type')) {
          requestHeaders.set('Content-Type', 'application/x-git-upload-pack-request');
        }
      }

      // For Git receive-pack requests, ensure proper content type
      if (isGit && request.method === 'POST' && url.pathname.endsWith('/git-receive-pack')) {
        if (!requestHeaders.has('Content-Type')) {
          requestHeaders.set('Content-Type', 'application/x-git-receive-pack-request');
        }
      }

      // Set Git LFS-specific headers
      if (isGitLFS) {
        if (!requestHeaders.has('User-Agent')) {
          requestHeaders.set('User-Agent', 'git-lfs/3.0.0 (GitHub; darwin amd64; go 1.17.2)');
        }
        
        // For LFS batch API requests
        if (url.pathname.includes('/objects/batch')) {
          if (!requestHeaders.has('Accept')) {
            requestHeaders.set('Accept', 'application/vnd.git-lfs+json');
          }
          if (request.method === 'POST' && !requestHeaders.has('Content-Type')) {
            requestHeaders.set('Content-Type', 'application/vnd.git-lfs+json');
          }
        }
        
        // For LFS object transfers
        if (url.pathname.match(/\/objects\/[a-fA-F0-9]{64}$/)) {
          if (!requestHeaders.has('Accept')) {
            requestHeaders.set('Accept', 'application/octet-stream');
          }
        }
      }

      // For AI inference requests, ensure proper content type and headers
      if (isAI) {
        // Ensure JSON content type for AI API requests if not already set
        if (request.method === 'POST' && !requestHeaders.has('Content-Type')) {
          requestHeaders.set('Content-Type', 'application/json');
        }

        // Set appropriate User-Agent for AI requests if not present
        if (!requestHeaders.has('User-Agent')) {
          requestHeaders.set('User-Agent', 'Xget-AI-Proxy/1.0');
        }
      }
    } else {
      // Regular file download headers
      Object.assign(fetchOptions, {
        cf: {
          http3: true,
          cacheTtl: config.CACHE_DURATION,
          cacheEverything: true,
          minify: {
            javascript: true,
            css: true,
            html: true
          },
          preconnect: true
        }
      });

      requestHeaders.set('Accept-Encoding', 'gzip, deflate, br');
      requestHeaders.set('Connection', 'keep-alive');
      requestHeaders.set('User-Agent', 'Wget/1.21.3');
      requestHeaders.set('Origin', request.headers.get('Origin') || '*');

      // Handle range requests - but don't forward Range header if we need to cache full content
      const rangeHeader = request.headers.get('Range');

      // Detect media files to avoid compression for better Range support
      const isMediaFile = targetUrl.match(
        /\.(mp4|avi|mkv|mov|wmv|flv|webm|mp3|wav|flac|aac|ogg|jpg|jpeg|png|gif|bmp|svg|pdf|zip|rar|7z|tar|gz|bz2|xz)$/i
      );

      if (isMediaFile || rangeHeader) {
        // For media files or range requests, avoid compression to ensure proper byte-range support
        requestHeaders.set('Accept-Encoding', 'identity');
      }

      // For Range requests, we need to decide whether to forward the Range header
      // If we want to cache the full content first, don't send Range to origin
      if (rangeHeader) {
        // Check if we already have full content cached
        const fullContentKey = new Request(targetUrl, {
          method: request.method,
          headers: new Headers(
            [...request.headers.entries()].filter(([k]) => k.toLowerCase() !== 'range')
          )
        });

        // If we're going to try to get full content for caching, don't send Range header
        // This will be handled in the retry logic
        requestHeaders.set('Range', rangeHeader);
      }
    }

    // Implement retry mechanism
    let attempts = 0;
    while (attempts < config.MAX_RETRIES) {
      try {
        monitor.mark(`attempt_${attempts}`);

        // Fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.TIMEOUT_SECONDS * 1000);

        // For Git/Docker operations, don't use Cloudflare-specific options
        const finalFetchOptions =
          isGit || isDocker
            ? { ...fetchOptions, signal: controller.signal }
            : { ...fetchOptions, signal: controller.signal };

        // Special handling for HEAD requests to ensure Content-Length header
        if (request.method === 'HEAD') {
          // First, try the HEAD request
          response = await fetch(targetUrl, finalFetchOptions);

          // If HEAD request succeeds but lacks Content-Length, do a GET request to get it
          if (response.ok && !response.headers.get('Content-Length')) {
            const getResponse = await fetch(targetUrl, {
              ...finalFetchOptions,
              method: 'GET'
            });

            if (getResponse.ok) {
              // Create a new response with HEAD method but include Content-Length from GET
              const headHeaders = new Headers(response.headers);
              const contentLength = getResponse.headers.get('Content-Length');

              if (contentLength) {
                headHeaders.set('Content-Length', contentLength);
              } else {
                // If still no Content-Length, calculate it from the response body
                const arrayBuffer = await getResponse.arrayBuffer();
                headHeaders.set('Content-Length', arrayBuffer.byteLength.toString());
              }

              response = new Response(null, {
                status: getResponse.status,
                statusText: getResponse.statusText,
                headers: headHeaders
              });
            }
          }
        } else {
          response = await fetch(targetUrl, finalFetchOptions);
        }

        clearTimeout(timeoutId);

        if (response.ok || response.status === 206) {
          monitor.mark('success');
          break;
        }

        // For container registry, handle authentication challenges more intelligently
        if (isDocker && response.status === 401) {
          monitor.mark('docker_auth_challenge');

          // For container registries, first check if we can get a token without credentials
          // This allows access to public repositories
          const authenticateStr = response.headers.get('WWW-Authenticate');
          if (authenticateStr) {
            try {
              const wwwAuthenticate = parseAuthenticate(authenticateStr);

              // Infer scope from the request path for container registry requests
              let scope = '';
              const pathParts = url.pathname.split('/');
              if (pathParts.length >= 4 && pathParts[1] === 'v2') {
                // Extract repository name from path like /v2/cr/ghcr/nginxinc/nginx-unprivileged/manifests/latest
                // Remove /v2 and platform prefix to get the repo path
                const repoPath = pathParts.slice(4).join('/'); // Skip /v2/cr/[registry]
                const repoParts = repoPath.split('/');
                if (repoParts.length >= 1) {
                  let repoName = repoParts.slice(0, -2).join('/'); // Remove /manifests/tag or /blobs/sha

                  // Special handling for Docker Hub: official images need 'library/' prefix
                  // Docker Hub stores official images like nginx, redis, etc. as library/nginx, library/redis
                  if (platform === 'cr-docker' && repoName && !repoName.includes('/')) {
                    repoName = `library/${repoName}`;
                  }

                  if (repoName) {
                    scope = `repository:${repoName}:pull`;
                  }
                }
              }

              // Try to get a token for public access (without authorization)
              const tokenResponse = await fetchToken(wwwAuthenticate, scope || '', '');
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                if (tokenData.token) {
                  // Retry the original request with the obtained token
                  const retryHeaders = new Headers(requestHeaders);
                  retryHeaders.set('Authorization', `Bearer ${tokenData.token}`);

                  const retryResponse = await fetch(targetUrl, {
                    ...finalFetchOptions,
                    headers: retryHeaders
                  });

                  if (retryResponse.ok) {
                    response = retryResponse;
                    monitor.mark('success');
                    break;
                  }
                }
              }
            } catch (error) {
              console.log('Token fetch failed:', error);
            }
          }

          // If token fetch failed or didn't work, return the unauthorized response
          // Only return this if we truly can't access the resource
          return responseUnauthorized(url);
        }

        // Don't retry on client errors (4xx) - these won't improve with retries
        if (response.status >= 400 && response.status < 500) {
          monitor.mark('client_error');
          break;
        }

        attempts++;
        if (attempts < config.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, config.RETRY_DELAY_MS * attempts));
        }
      } catch (error) {
        attempts++;
        if (error instanceof Error && error.name === 'AbortError') {
          return createErrorResponse('Request timeout', 408);
        }
        if (attempts >= config.MAX_RETRIES) {
          const message = error instanceof Error ? error.message : String(error);
          return createErrorResponse(
            `Failed after ${config.MAX_RETRIES} attempts: ${message}`,
            500,
            true
          );
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, config.RETRY_DELAY_MS * attempts));
      }
    }

    // Check if we have a valid response after all attempts
    if (!response) {
      return createErrorResponse('No response received after all retry attempts', 500, true);
    }

    // If response is still not ok after all retries, return the error
    if (!response.ok && response.status !== 206) {
      // For Docker authentication errors that we couldn't resolve with anonymous tokens,
      // return a more helpful error message
      if (isDocker && response.status === 401) {
        const errorText = await response.text().catch(() => '');
        return createErrorResponse(
          `Authentication required for this container registry resource. This may be a private repository. Original error: ${errorText}`,
          401,
          true
        );
      }
      const errorText = await response.text().catch(() => 'Unknown error');
      return createErrorResponse(
        `Upstream server error (${response.status}): ${errorText}`,
        response.status,
        true
      );
    }

    // Handle URL rewriting for different platforms
    let responseBody = response.body;

    // Handle PyPI simple index URL rewriting
    if (platform === 'pypi' && response.headers.get('content-type')?.includes('text/html')) {
      const originalText = await response.text();
      // Rewrite URLs in the response body to go through the Cloudflare Worker
      // files.pythonhosted.org URLs should be rewritten to go through our pypi/files endpoint
      const rewrittenText = originalText.replace(
        /https:\/\/files\.pythonhosted\.org/g,
        `${url.origin}/pypi/files`
      );
      responseBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(rewrittenText));
          controller.close();
        }
      });
    }

    // Handle npm registry URL rewriting
    if (platform === 'npm' && response.headers.get('content-type')?.includes('application/json')) {
      const originalText = await response.text();
      // Rewrite tarball URLs in npm registry responses to go through our npm endpoint
      // https://registry.npmjs.org/package/-/package-version.tgz -> https://xget.xi-xu.me/npm/package/-/package-version.tgz
      const rewrittenText = originalText.replace(
        /https:\/\/registry\.npmjs\.org\/([^\/]+)/g,
        `${url.origin}/npm/$1`
      );
      responseBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(rewrittenText));
          controller.close();
        }
      });
    }

    // Prepare response headers
    const headers = new Headers(response.headers);

    if (isGit || isDocker) {
      // For Git/Docker operations, preserve all headers from the upstream response
      // These protocols are very sensitive to header changes
      // Don't add any additional headers that might interfere with protocol operation
      // The response headers from upstream should be passed through as-is
    } else {
      // Regular file download headers
      headers.set('Cache-Control', `public, max-age=${config.CACHE_DURATION}`);
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Accept-Ranges', 'bytes');

      // Ensure Content-Length is present for proper Range support
      if (!headers.has('Content-Length') && response.status === 200) {
        // If Content-Length is missing and we have access to the body, calculate it
        try {
          const contentLength = response.headers.get('Content-Length');
          if (contentLength) {
            headers.set('Content-Length', contentLength);
          }
        } catch (error) {
          console.warn('Could not set Content-Length header:', error);
        }
      }

      addSecurityHeaders(headers);
    }

    // Create final response
    const finalResponse = new Response(responseBody, {
      status: response.status,
      headers
    });

    // Cache successful responses (skip caching for Git, Git LFS, Docker, and AI inference operations)
    // Only cache GET and HEAD requests to avoid "Cannot cache response to non-GET request" errors
    // IMPORTANT: Only cache 200 responses, NOT 206 responses (Cloudflare Workers Cache API rejects 206)
    if (
      !isGit &&
      !isGitLFS &&
      !isDocker &&
      !isAI &&
      ['GET', 'HEAD'].includes(request.method) &&
      response.ok &&
      response.status === 200 // Only cache complete responses (200), not partial content (206)
    ) {
      // For Range requests that resulted in 200, cache the full response
      const rangeHeader = request.headers.get('Range');
      const cacheKey = rangeHeader
        ? new Request(targetUrl, {
            method: request.method,
            headers: new Headers(
              [...request.headers.entries()].filter(([k]) => k.toLowerCase() !== 'range')
            )
          })
        : new Request(targetUrl, request);

      ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));

      // If this was originally a Range request and we got a 200 (full content),
      // try cache.match again with the original Range request to get 206 response
      if (rangeHeader && response.status === 200) {
        const rangedResponse = await cache.match(new Request(targetUrl, request));
        if (rangedResponse) {
          monitor.mark('range_cache_hit_after_full_cache');
          return rangedResponse;
        }
      }
    }

    monitor.mark('complete');
    return isGit || isGitLFS || isDocker || isAI
      ? finalResponse
      : addPerformanceHeaders(finalResponse, monitor);
  } catch (error) {
    console.error('Error handling request:', error);
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Internal Server Error: ${message}`, 500, true);
  }
}

/**
 * Adds performance metrics to response headers
 * @param {Response} response - The response object
 * @param {PerformanceMonitor} monitor - Performance monitor instance
 * @returns {Response} New response with performance headers
 */
function addPerformanceHeaders(response, monitor) {
  const headers = new Headers(response.headers);
  headers.set('X-Performance-Metrics', JSON.stringify(monitor.getMetrics()));
  addSecurityHeaders(headers);
  return new Response(response.body, {
    status: response.status,
    headers
  });
}

export default {
  /**
   * Main entry point for the Cloudflare Worker
   * @param {Request} request - The incoming request
   * @param {Object} env - Environment variables
   * @param {ExecutionContext} ctx - Cloudflare Workers execution context
   * @returns {Promise<Response>} The response object
   */
  fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};
