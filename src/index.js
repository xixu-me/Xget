/**
 * Xget - High-performance acceleration engine for developer resources
 * Copyright (C) 2025 Xi Xu
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { CONFIG, createConfig } from './config/index.js';
import { transformPath } from './config/platforms.js';

/**
 * Monitors performance metrics during request processing.
 *
 * This class tracks timing information throughout request handling lifecycle,
 * allowing measurement of cache hits, upstream fetch attempts, and total processing time.
 *
 * @example
 * // Track request processing performance
 * const monitor = new PerformanceMonitor();
 * monitor.mark('cache_check');
 * // ... check cache ...
 * monitor.mark('upstream_fetch');
 * // ... fetch from upstream ...
 * monitor.mark('complete');
 * const metrics = monitor.getMetrics();
 * // { cache_check: 5, upstream_fetch: 120, complete: 150 }
 *
 * @example
 * // Use with response headers
 * const monitor = new PerformanceMonitor();
 * monitor.mark('operation_complete');
 * const response = addPerformanceHeaders(originalResponse, monitor);
 * // Response will include X-Performance-Metrics header with timing data
 */
class PerformanceMonitor {
  /**
   * Initializes a new performance monitor.
   *
   * Sets the start time to the current timestamp and creates an empty marks collection.
   * All subsequent timing marks will be relative to this start time.
   */
  constructor() {
    this.startTime = Date.now();
    this.marks = new Map();
  }

  /**
   * Marks a timing point with the given name.
   *
   * Records the elapsed time (in milliseconds) since the monitor was created.
   * If a mark with the same name already exists, logs a warning and overwrites it.
   *
   * @param {string} name - The name of the timing mark (e.g., 'cache_hit', 'attempt_0', 'success')
   *
   * @example
   * const monitor = new PerformanceMonitor();
   * monitor.mark('start_fetch');
   * // ... perform fetch ...
   * monitor.mark('fetch_complete');
   * // Marks: { start_fetch: 0, fetch_complete: 245 }
   */
  mark(name) {
    if (this.marks.has(name)) {
      console.warn(`Mark with name ${name} already exists.`);
    }
    this.marks.set(name, Date.now() - this.startTime);
  }

  /**
   * Returns all collected metrics as a plain object.
   *
   * Converts the internal Map of timing marks to a JavaScript object suitable for
   * JSON serialization and inclusion in response headers.
   *
   * @returns {Object.<string, number>} Object containing name-timestamp pairs in milliseconds
   *
   * @example
   * const monitor = new PerformanceMonitor();
   * monitor.mark('cache_check');
   * monitor.mark('upstream_fetch');
   * const metrics = monitor.getMetrics();
   * console.log(metrics);
   * // { cache_check: 5, upstream_fetch: 120 }
   *
   * @example
   * // Serialize metrics for logging
   * const metrics = monitor.getMetrics();
   * console.log(JSON.stringify(metrics));
   * // '{"cache_check":5,"upstream_fetch":120}'
   */
  getMetrics() {
    return Object.fromEntries(this.marks.entries());
  }
}

/**
 * Detects if a request is a container registry operation (Docker/OCI).
 *
 * Identifies Docker and OCI registry requests by checking for:
 * - Registry API endpoints (/v2/...)
 * - Docker-specific User-Agent headers
 * - Docker/OCI manifest Accept headers
 *
 * @param {Request} request - The incoming request object
 * @param {URL} url - Parsed URL object
 * @returns {boolean} True if this is a container registry operation
 *
 * @example
 * // Docker registry manifest request
 * const req = new Request('https://example.com/v2/library/nginx/manifests/latest');
 * const url = new URL(req.url);
 * isDockerRequest(req, url); // true
 *
 * @example
 * // Docker client User-Agent
 * const req = new Request('https://example.com/some/path', {
 *   headers: { 'User-Agent': 'docker/20.10.7' }
 * });
 * const url = new URL(req.url);
 * isDockerRequest(req, url); // true
 *
 * @example
 * // OCI manifest Accept header
 * const req = new Request('https://example.com/some/path', {
 *   headers: { 'Accept': 'application/vnd.oci.image.manifest.v1+json' }
 * });
 * const url = new URL(req.url);
 * isDockerRequest(req, url); // true
 *
 * @example
 * // Regular HTTP request (not Docker)
 * const req = new Request('https://example.com/file.tar.gz');
 * const url = new URL(req.url);
 * isDockerRequest(req, url); // false
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
 * Detects if a request is a Git protocol operation.
 *
 * Identifies Git requests by checking for:
 * - Git-specific endpoints (/info/refs, /git-upload-pack, /git-receive-pack)
 * - Git User-Agent headers
 * - Git service query parameters
 * - Git-specific Content-Type headers
 *
 * @param {Request} request - The incoming request object
 * @param {URL} url - Parsed URL object
 * @returns {boolean} True if this is a Git operation
 *
 * @example
 * // Git clone/fetch request (info/refs)
 * const req = new Request('https://example.com/repo.git/info/refs?service=git-upload-pack');
 * const url = new URL(req.url);
 * isGitRequest(req, url); // true
 *
 * @example
 * // Git push request (git-receive-pack)
 * const req = new Request('https://example.com/repo.git/git-receive-pack', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/x-git-receive-pack-request' }
 * });
 * const url = new URL(req.url);
 * isGitRequest(req, url); // true
 *
 * @example
 * // Git client User-Agent
 * const req = new Request('https://example.com/repo', {
 *   headers: { 'User-Agent': 'git/2.34.1' }
 * });
 * const url = new URL(req.url);
 * isGitRequest(req, url); // true
 *
 * @example
 * // Regular HTTP request (not Git)
 * const req = new Request('https://example.com/file.zip');
 * const url = new URL(req.url);
 * isGitRequest(req, url); // false
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
 * Detects if a request is a Git LFS (Large File Storage) operation.
 *
 * Identifies Git LFS requests by checking for:
 * - LFS-specific endpoints (/info/lfs, /objects/batch)
 * - LFS object storage paths (SHA-256 hash patterns)
 * - Git LFS Accept/Content-Type headers
 * - Git LFS User-Agent
 *
 * @param {Request} request - The incoming request object
 * @param {URL} url - Parsed URL object
 * @returns {boolean} True if this is a Git LFS operation
 *
 * @example
 * // Git LFS batch API request
 * const req = new Request('https://example.com/repo.git/info/lfs/objects/batch', {
 *   method: 'POST',
 *   headers: { 'Accept': 'application/vnd.git-lfs+json' }
 * });
 * const url = new URL(req.url);
 * isGitLFSRequest(req, url); // true
 *
 * @example
 * // Git LFS object download (SHA-256 hash)
 * const req = new Request(
 *   'https://example.com/repo.git/info/lfs/objects/a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef'
 * );
 * const url = new URL(req.url);
 * isGitLFSRequest(req, url); // true
 *
 * @example
 * // Git LFS client User-Agent
 * const req = new Request('https://example.com/repo', {
 *   headers: { 'User-Agent': 'git-lfs/3.0.0 (GitHub; darwin amd64; go 1.17.2)' }
 * });
 * const url = new URL(req.url);
 * isGitLFSRequest(req, url); // true
 *
 * @example
 * // Regular Git request (not LFS)
 * const req = new Request('https://example.com/repo.git/info/refs');
 * const url = new URL(req.url);
 * isGitLFSRequest(req, url); // false
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

  if (
    accept.includes('application/vnd.git-lfs') ||
    contentType.includes('application/vnd.git-lfs')
  ) {
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
 * Detects if a request is for an AI inference provider API.
 *
 * Identifies AI inference requests by checking for:
 * - AI provider path prefix (/ip/{provider}/...)
 * - Common AI API endpoints (chat, completions, embeddings, etc.)
 * - AI-specific URL patterns with JSON POST requests
 *
 * @param {Request} request - The incoming request object
 * @param {URL} url - Parsed URL object
 * @returns {boolean} True if this is an AI inference request
 *
 * @example
 * // OpenAI chat completions request
 * const req = new Request('https://example.com/ip/openai/v1/chat/completions', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' }
 * });
 * const url = new URL(req.url);
 * isAIInferenceRequest(req, url); // true
 *
 * @example
 * // Anthropic messages API request
 * const req = new Request('https://example.com/ip/anthropic/v1/messages', {
 *   method: 'POST'
 * });
 * const url = new URL(req.url);
 * isAIInferenceRequest(req, url); // true
 *
 * @example
 * // Generic AI embeddings endpoint
 * const req = new Request('https://example.com/ip/cohere/v1/embeddings');
 * const url = new URL(req.url);
 * isAIInferenceRequest(req, url); // true
 *
 * @example
 * // Regular API request (not AI)
 * const req = new Request('https://example.com/api/users');
 * const url = new URL(req.url);
 * isAIInferenceRequest(req, url); // false
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
 * Validates incoming requests against security rules.
 *
 * Performs security validation including:
 * - HTTP method validation (with special allowances for Git/Docker/AI operations)
 * - URL path length limits
 *
 * Different protocols have different allowed methods:
 * - Regular requests: GET, HEAD (configurable via SECURITY.ALLOWED_METHODS)
 * - Git/LFS/Docker/AI: GET, HEAD, POST, PUT, PATCH
 *
 * @param {Request} request - The incoming request object
 * @param {URL} url - Parsed URL object
 * @param {import('./config/index.js').ApplicationConfig} config - Configuration object
 * @returns {{valid: boolean, error?: string, status?: number}} Validation result object
 *
 * @example
 * // Valid GET request
 * const req = new Request('https://example.com/gh/torvalds/linux');
 * const url = new URL(req.url);
 * const result = validateRequest(req, url);
 * // { valid: true }
 *
 * @example
 * // Invalid method for regular request
 * const req = new Request('https://example.com/npm/lodash', { method: 'DELETE' });
 * const url = new URL(req.url);
 * const result = validateRequest(req, url);
 * // { valid: false, error: 'Method not allowed', status: 405 }
 *
 * @example
 * // Valid POST for Git operation
 * const req = new Request('https://example.com/gh/user/repo.git/git-upload-pack', {
 *   method: 'POST'
 * });
 * const url = new URL(req.url);
 * const result = validateRequest(req, url);
 * // { valid: true }
 *
 * @example
 * // Path too long
 * const longPath = '/npm/' + 'a'.repeat(3000);
 * const req = new Request(`https://example.com${longPath}`);
 * const url = new URL(req.url);
 * const result = validateRequest(req, url);
 * // { valid: false, error: 'Path too long', status: 414 }
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
 * Creates a standardized error response with security headers.
 *
 * Generates an HTTP error response with appropriate content type and security headers.
 * Can return either plain text or detailed JSON error format.
 *
 * @param {string} message - Error message to display
 * @param {number} status - HTTP status code (e.g., 400, 404, 500)
 * @param {boolean} includeDetails - Whether to include detailed JSON error information
 * @returns {Response} Error response with security headers
 *
 * @example
 * // Simple text error
 * const response = createErrorResponse('Not found', 404);
 * // Response: "Not found" (text/plain) with status 404
 *
 * @example
 * // Detailed JSON error
 * const response = createErrorResponse('Internal error', 500, true);
 * // Response: { "error": "Internal error", "status": 500, "timestamp": "2024-01-01T00:00:00.000Z" }
 *
 * @example
 * // Validation error
 * const response = createErrorResponse('Method not allowed', 405);
 * // Response: "Method not allowed" (text/plain) with status 405
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
 * Adds comprehensive security headers to response headers.
 *
 * Applies industry-standard security headers including:
 * - HSTS (HTTP Strict Transport Security)
 * - X-Frame-Options (clickjacking protection)
 * - X-XSS-Protection (XSS filter)
 * - Referrer-Policy (referrer information control)
 * - Content-Security-Policy (resource loading restrictions)
 * - Permissions-Policy (privacy-invasive feature restrictions)
 *
 * @param {Headers} headers - Headers object to modify (mutates in place)
 * @returns {Headers} Modified headers object (same reference)
 *
 * @example
 * // Add security headers to a response
 * const headers = new Headers({ 'Content-Type': 'text/html' });
 * addSecurityHeaders(headers);
 * // Headers now include HSTS, CSP, etc.
 *
 * @example
 * // Use with error response
 * const errorHeaders = new Headers({ 'Content-Type': 'application/json' });
 * addSecurityHeaders(errorHeaders);
 * const response = new Response(JSON.stringify({ error: 'Not found' }), {
 *   status: 404,
 *   headers: errorHeaders
 * });
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
 * Parses Docker/OCI registry WWW-Authenticate header.
 *
 * Extracts authentication realm and service information from the Bearer
 * authentication challenge header returned by container registries.
 *
 * @param {string} authenticateStr - The WWW-Authenticate header value
 * @returns {{realm: string, service: string}} Parsed authentication info with realm URL and service name
 * @throws {Error} If the header format is invalid or missing required fields
 *
 * @example
 * // Parse Docker Hub authentication header
 * const header = 'Bearer realm="https://auth.docker.io/token",service="registry.docker.io"';
 * const auth = parseAuthenticate(header);
 * // { realm: 'https://auth.docker.io/token', service: 'registry.docker.io' }
 *
 * @example
 * // Parse GitHub Container Registry header
 * const header = 'Bearer realm="https://ghcr.io/token",service="ghcr.io"';
 * const auth = parseAuthenticate(header);
 * // { realm: 'https://ghcr.io/token', service: 'ghcr.io' }
 *
 * @example
 * // Invalid header throws error
 * try {
 *   parseAuthenticate('Basic realm="example"');
 * } catch (error) {
 *   console.error(error.message); // "invalid Www-Authenticate Header: Basic realm="example""
 * }
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
 * Fetches authentication token from container registry token service.
 *
 * Requests a Bearer token from the registry's authentication service,
 * optionally including scope (repository permissions) and authorization credentials.
 *
 * @param {{realm: string, service: string}} wwwAuthenticate - Authentication info from WWW-Authenticate header
 * @param {string} scope - The scope for the token (e.g., "repository:library/nginx:pull")
 * @param {string} authorization - Authorization header value (optional, for authenticated access)
 * @returns {Promise<Response>} Token response containing JWT token
 *
 * @example
 * // Fetch anonymous token for public repository
 * const auth = { realm: 'https://auth.docker.io/token', service: 'registry.docker.io' };
 * const scope = 'repository:library/nginx:pull';
 * const response = await fetchToken(auth, scope, '');
 * const data = await response.json();
 * // { token: 'eyJhbGc...', expires_in: 300, issued_at: '...' }
 *
 * @example
 * // Fetch authenticated token for private repository
 * const auth = { realm: 'https://ghcr.io/token', service: 'ghcr.io' };
 * const scope = 'repository:user/private-repo:pull';
 * const authHeader = 'Basic dXNlcjpwYXNz';
 * const response = await fetchToken(auth, scope, authHeader);
 *
 * @example
 * // Fetch token without scope (for catalog access)
 * const auth = { realm: 'https://registry.example.com/token', service: 'example.com' };
 * const response = await fetchToken(auth, '', '');
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
 * Creates an unauthorized (401) response for container registry authentication.
 *
 * Generates a Docker/OCI registry-compliant 401 response with a WWW-Authenticate
 * header that directs clients to the token authentication endpoint.
 *
 * @param {URL} url - Request URL used to construct authentication realm
 * @returns {Response} Unauthorized response with WWW-Authenticate header
 *
 * @example
 * // Create unauthorized response for registry request
 * const url = new URL('https://example.com/v2/library/nginx/manifests/latest');
 * const response = responseUnauthorized(url);
 * // Response status: 401
 * // Response headers: WWW-Authenticate: Bearer realm="https://example.com/v2/auth",service="Xget"
 * // Response body: {"message":"UNAUTHORIZED"}
 *
 * @example
 * // Docker client will follow authentication flow
 * // 1. Receive 401 with WWW-Authenticate
 * // 2. Request token from realm URL
 * // 3. Retry original request with Bearer token
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
 * Main request handler with comprehensive caching, retry logic, and security measures.
 *
 * This is the core request processing function that:
 * 1. Validates requests against security rules
 * 2. Detects protocol type (Git, Docker, AI, or regular HTTP)
 * 3. Transforms URLs based on platform configuration
 * 4. Implements intelligent caching strategies
 * 5. Handles upstream fetches with retry logic and timeouts
 * 6. Performs protocol-specific operations (Docker auth, URL rewriting)
 * 7. Adds security and performance headers
 *
 * **Request Flow:**
 * ```
 * Request → Validate → Detect Protocol → Transform URL → Check Cache
 *   → Fetch Upstream (with retries) → Handle Auth → Rewrite Response
 *   → Add Security Headers → Cache → Return with Performance Metrics
 * ```
 *
 * **Caching Strategy:**
 * - Git, Git LFS, Docker, AI inference: No caching (protocol compliance)
 * - Regular downloads: 30-minute cache (configurable)
 * - Range requests: Intelligent full-content caching
 *
 * **Retry Logic:**
 * - Max 3 attempts (configurable)
 * - 30-second timeout per attempt
 * - Exponential backoff between retries
 * - No retry on 4xx client errors
 *
 * @param {Request} request - The incoming HTTP request
 * @param {Object} env - Cloudflare Workers environment variables for runtime config overrides
 * @param {ExecutionContext} ctx - Cloudflare Workers execution context for background tasks
 * @returns {Promise<Response>} The HTTP response with appropriate headers and body
 *
 * @example
 * // Regular file download (cached)
 * const request = new Request('https://example.com/npm/lodash');
 * const response = await handleRequest(request, {}, ctx);
 * // Returns: Package data with 30-minute cache
 *
 * @example
 * // Git clone operation (not cached)
 * const request = new Request('https://example.com/gh/torvalds/linux/info/refs?service=git-upload-pack');
 * const response = await handleRequest(request, {}, ctx);
 * // Returns: Git protocol response, bypasses cache
 *
 * @example
 * // Docker image pull (with authentication)
 * const request = new Request('https://example.com/v2/cr/docker/library/nginx/manifests/latest');
 * const response = await handleRequest(request, {}, ctx);
 * // Returns: Docker manifest, handles token auth automatically
 *
 * @example
 * // AI inference request (proxied)
 * const request = new Request('https://example.com/ip/openai/v1/chat/completions', {
 *   method: 'POST',
 *   body: JSON.stringify({ model: 'gpt-4', messages: [...] })
 * });
 * const response = await handleRequest(request, {}, ctx);
 * // Returns: AI API response, bypasses cache
 *
 * @example
 * // With environment variable overrides
 * const env = { TIMEOUT_SECONDS: '60', CACHE_DURATION: '3600' };
 * const response = await handleRequest(request, env, ctx);
 * // Uses 60s timeout and 1-hour cache instead of defaults
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

    const platform =
      sortedPlatforms.find(key => {
        const expectedPrefix = `/${key.replace('-', '/')}/`;
        return effectivePath.startsWith(expectedPrefix);
      }) || effectivePath.split('/')[1];

    if (!platform || !config.PLATFORMS[platform]) {
      const HOME_PAGE_URL = 'https://github.com/xixu-me/Xget';
      return Response.redirect(HOME_PAGE_URL, 302);
    }

    // Check if the path only contains the platform prefix without any actual resource path
    // For example: /gh, /npm, /pypi (should be /gh/user/repo, /npm/package, etc.)
    const platformPath = `/${platform.replace(/-/g, '/')}`;
    if (effectivePath === platformPath || effectivePath === `${platformPath}/`) {
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
    // Note: caches API is only available in Cloudflare Workers, not in standard environments
    /** @type {Cache | null} */
    // @ts-ignore - Cloudflare Workers cache API
    const cache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
    let response;

    if (cache && !isGit && !isGitLFS && !isDocker && !isAI) {
      try {
        // For Range requests, try cache match first
        // Always use GET method for cache key to match how we store (cache.put only accepts GET)
        const cacheKey = new Request(targetUrl, {
          method: 'GET',
          headers: request.headers
        });
        response = await cache.match(cacheKey);
        if (response) {
          monitor.mark('cache_hit');
          return response;
        }

        // If Range request missed cache, try with original request to see if we have full content cached
        const rangeHeader = request.headers.get('Range');
        if (rangeHeader) {
          const fullContentKey = new Request(targetUrl, {
            method: 'GET', // Always use GET method for cache key consistency
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
      } catch (cacheError) {
        // Cache API not available or failed - continue without caching
        console.warn('Cache API unavailable:', cacheError);
      }
    }

    /** @type {RequestInit} */
    const fetchOptions = {
      method: request.method,
      headers: new Headers(),
      redirect: 'follow'
    };

    // Add body for POST/PUT/PATCH requests (Git/Docker/AI inference operations)
    if (
      ['POST', 'PUT', 'PATCH'].includes(request.method) &&
      (isGit || isGitLFS || isDocker || isAI)
    ) {
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
      // Rewrite URLs in the response body to go through the Cloudflare Workers
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
    // Only cache GET requests (HEAD requests cannot be cached due to Cache API limitations)
    // IMPORTANT: Only cache 200 responses, NOT 206 responses (Cloudflare Workers Cache API rejects 206)
    // Note: caching only works in Cloudflare Workers environment
    if (
      cache &&
      !isGit &&
      !isGitLFS &&
      !isDocker &&
      !isAI &&
      request.method === 'GET' && // Only cache GET requests, not HEAD
      response.ok &&
      response.status === 200 // Only cache complete responses (200), not partial content (206)
    ) {
      // For Range requests that resulted in 200, cache the full response
      const rangeHeader = request.headers.get('Range');
      // Always use GET method for cache key
      const cacheKey = rangeHeader
        ? new Request(targetUrl, {
            method: 'GET',
            headers: new Headers(
              [...request.headers.entries()].filter(([k]) => k.toLowerCase() !== 'range')
            )
          })
        : new Request(targetUrl, { method: 'GET' });

      // Use waitUntil if available (Cloudflare Workers), otherwise cache synchronously
      // Wrap in try-catch in case cache API fails
      try {
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
        } else {
          // In non-Workers environment, cache put happens synchronously
          cache.put(cacheKey, finalResponse.clone()).catch(error => {
            console.warn('Cache put failed:', error);
          });
        }

        // If this was originally a Range request and we got a 200 (full content),
        // try cache.match again with the original Range request to get 206 response
        if (rangeHeader && response.status === 200) {
          // Always use GET method for cache match, even for Range requests
          const rangedResponse = await cache.match(
            new Request(targetUrl, {
              method: 'GET',
              headers: request.headers
            })
          );
          if (rangedResponse) {
            monitor.mark('range_cache_hit_after_full_cache');
            return rangedResponse;
          }
        }
      } catch (cacheError) {
        // Cache API not available or failed - continue without caching
        console.warn('Cache put/match failed:', cacheError);
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
 * Adds performance metrics to response headers.
 *
 * Creates a new response with an X-Performance-Metrics header containing
 * timing data from the PerformanceMonitor instance. Also ensures security
 * headers are included.
 *
 * **Note:** This header is only added to non-protocol responses (not Git/Docker/AI).
 *
 * @param {Response} response - The original response object
 * @param {PerformanceMonitor} monitor - Performance monitor instance with collected metrics
 * @returns {Response} New response with added performance and security headers
 *
 * @example
 * // Add performance metrics to response
 * const monitor = new PerformanceMonitor();
 * monitor.mark('cache_hit');
 * monitor.mark('complete');
 * const response = new Response('data', { status: 200 });
 * const enhancedResponse = addPerformanceHeaders(response, monitor);
 * // Response headers include: X-Performance-Metrics: {"cache_hit":5,"complete":150}
 *
 * @example
 * // Check performance metrics from client side
 * const response = await fetch('https://example.com/npm/lodash');
 * const metrics = response.headers.get('X-Performance-Metrics');
 * console.log(JSON.parse(metrics));
 * // { cache_check: 2, attempt_0: 10, success: 245, complete: 250 }
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

/**
 * Cloudflare Workers module export.
 *
 * This is the entry point for the Xget acceleration engine deployed on
 * Cloudflare Workers. The fetch handler receives all incoming HTTP requests
 * and delegates processing to the handleRequest function.
 *
 * **Deployment:** This module is deployed as a Cloudflare Workers and handles
 * requests at the edge for optimal performance and global distribution.
 *
 * @example
 * // Cloudflare Workers runtime calls this automatically
 * // Worker receives request → export.fetch() → handleRequest() → Response
 *
 * @example
 * // Local testing with Wrangler
 * // npm run dev
 * // Wrangler dev server simulates Cloudflare Workers environment
 */
export default {
  /**
   * Main entry point for the Cloudflare Workers fetch event.
   *
   * This method is automatically invoked by the Cloudflare Workers runtime
   * for every incoming HTTP request. It delegates all request processing
   * to the handleRequest function.
   *
   * @param {Request} request - The incoming HTTP request from Cloudflare Workers runtime
   * @param {Object} env - Environment variables and bindings (KV, Durable Objects, secrets, etc.)
   * @param {ExecutionContext} ctx - Execution context for waitUntil() and passThroughOnException()
   * @returns {Promise<Response>} The HTTP response to return to the client
   *
   * @example
   * // This is called automatically by Cloudflare Workers
   * // User requests: https://xget.example.com/npm/lodash
   * // Runtime invokes: export.default.fetch(request, env, ctx)
   * // Returns: Response with package data
   *
   * @example
   * // Environment variables usage
   * // wrangler.toml: [vars] TIMEOUT_SECONDS = "60"
   * // env object contains: { TIMEOUT_SECONDS: "60" }
   * // handleRequest uses createConfig(env) to override defaults
   */
  fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};
