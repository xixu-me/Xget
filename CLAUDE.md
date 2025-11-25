# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Xget is a high-performance, security-focused acceleration engine for developer resources. It's a Cloudflare Workers application written in JavaScript that proxies and accelerates access to 40+ platforms including code repositories (GitHub, GitLab), package managers (npm, PyPI, Maven), container registries (Docker Hub, ghcr.io), AI inference providers (OpenAI, Anthropic), and Linux distributions.

**Key characteristics:**

- Runs on Cloudflare Workers (edge computing platform)
- Single-file architecture: all core logic in `src/index.js` (~1500 lines)
- Configuration-driven platform support via `src/config/platforms.js`
- No external dependencies in production (uses only Web APIs and Cloudflare Workers APIs)
- Supports HTTP/3, intelligent caching, retry logic, and performance monitoring

## Development Commands

### Local Development

```bash
npm run dev          # Start local development server with Wrangler
npm start            # Alias for npm run dev
```

### Testing

```bash
npm test             # Run all tests with Vitest (watch mode)
npm run test:run     # Run tests once without watch mode
npm run test:coverage # Generate coverage report (requires 80% threshold)
npm run test:ui      # Launch Vitest UI
npm run test:watch   # Explicitly run in watch mode
```

**Run a single test file:**

```bash
npx vitest run test/platforms.test.js
```

**Run tests matching a pattern:**

```bash
npm test -- --grep "GitHub"
```

### Code Quality

```bash
npm run lint         # Run ESLint on src/ and test/
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check formatting without modifying
npm run type-check   # Run TypeScript type checking (no emit)
```

### Deployment

```bash
npm run deploy       # Deploy to Cloudflare Workers
```

**Note:** Deployment requires Cloudflare account and proper wrangler authentication (`wrangler login`).

## Architecture

### Core Request Flow

1. **Request Reception** (`src/index.js` fetch handler)
   - Validates HTTP method (GET/HEAD by default, POST allowed for Git operations)
   - Enforces path length limits (max 2048 characters)
   - Creates `PerformanceMonitor` instance for timing metrics

2. **Platform Detection & URL Transformation**
   - Extracts platform prefix from URL path (e.g., `/gh/user/repo` → platform: `gh`)
   - Uses `transformPath()` from `src/config/platforms.js` to convert Xget URL to upstream URL
   - Platform config in `PLATFORMS` object maps prefixes to base URLs

3. **Protocol Detection**
   - **Git detection** (`isGitRequest`): checks for `/info/refs`, `/git-upload-pack`, `/git-receive-pack`, Git User-Agent
   - **Docker detection** (`isDockerRequest`): checks for `/v2/` paths, Docker User-Agent, OCI manifest headers
   - **Git LFS detection** (`isGitLFSRequest`): checks for `.git/info/lfs`, `application/vnd.git-lfs+json`
   - **AI inference detection** (`isAIInferenceRequest`): checks for `ip-` platform prefix

4. **Caching Layer**
   - Cache is **skipped** for Git, Git LFS, Docker, and AI inference requests
   - Uses Cloudflare Cache API for HTTP GET/HEAD requests
   - Default TTL: 1800 seconds (30 minutes)
   - Supports HTTP Range requests with intelligent cache lookup

5. **Upstream Fetch with Retry**
   - Retry logic: max 3 attempts with linear backoff (1000ms × retry count)
   - Timeout: 30 seconds per request
   - Request headers are proxied (User-Agent, Authorization, Range, etc.)
   - Special handling for Git (`service=git-upload-pack` query params) and Docker (authentication flow)

6. **Response Processing**
   - Adds security headers (HSTS, CSP, X-Frame-Options, etc.)
   - Adds performance metrics via `X-Performance-Metrics` header
   - Caches successful responses (200-299 status codes)
   - Handles CORS for allowed origins

### Platform Configuration System

**File:** `src/config/platforms.js`

This file contains:

- `PLATFORMS` object: maps platform prefixes to base URLs (e.g., `gh: 'https://github.com'`)
- `transformPath(effectivePath, platform)` function: converts Xget paths to upstream paths
  - Handles special cases like container registries (`cr-*` platforms)
  - Strips platform prefix and reconstructs correct upstream URL structure

**Adding a new platform:**

1. Add entry to `PLATFORMS` object with prefix and base URL
2. If URL transformation needs special logic, add case in `transformPath()`
3. Add tests in `test/platforms.test.js`
4. Update documentation (README.md)

### Configuration & Environment

**File:** `src/config/index.js`

The `createConfig(env)` function creates runtime configuration from environment variables:

- `TIMEOUT_SECONDS` (default: 30)
- `MAX_RETRIES` (default: 3)
- `RETRY_DELAY_MS` (default: 1000)
- `CACHE_DURATION` (default: 1800)
- `ALLOWED_METHODS` (default: 'GET,HEAD')
- `ALLOWED_ORIGINS` (default: '*')
- `MAX_PATH_LENGTH` (default: 2048)

Environment variables are set via Cloudflare Workers dashboard or `wrangler.toml`.

## Testing Strategy

**Framework:** Vitest with `@cloudflare/vitest-pool-workers` (simulates Cloudflare Workers environment)

**Test Organization:**

- `test/index.test.js` - Core request handling logic
- `test/platforms.test.js` - Platform URL transformation logic
- `test/integration.test.js` - End-to-end integration tests
- `test/security.test.js` - Security validation (headers, input validation)
- `test/performance.test.js` - Performance monitoring tests
- `test/range-cache.test.js` - HTTP Range request caching
- `test/container-registry.test.js` - Docker/OCI registry support
- `test/[platform].test.js` - Platform-specific tests (npm, homebrew, jenkins, etc.)
- `test/helpers/test-utils.js` - Shared test utilities and mock helpers

**Coverage requirements:** 80% minimum (branches, functions, lines, statements)

**Important testing notes:**

- Tests run in a simulated Cloudflare Workers environment (not Node.js)
- Use `SELF.fetch()` to test the worker (provided by vitest-pool-workers)
- Mock external fetch calls using `vi.spyOn(globalThis, 'fetch')`
- Test fixtures in `test/fixtures/` for sample responses

## Code Style & Conventions

**Enforced by ESLint + Prettier:**

- 2-space indentation
- Single quotes for strings
- Semicolons required
- camelCase for variables/functions
- UPPER_SNAKE_CASE for constants
- PascalCase for classes
- Use JSDoc comments for all exported functions and classes

**Example JSDoc:**

```javascript
/**
 * Transforms incoming request path to upstream platform URL.
 *
 * @param {string} effectivePath - The path from the Xget URL
 * @param {string} platform - Platform prefix (e.g., 'gh', 'npm')
 * @returns {string} Transformed path for upstream request
 *
 * @example
 * transformPath('/gh/user/repo/file.txt', 'gh')
 * // Returns: '/user/repo/file.txt'
 */
```

## Common Development Tasks

### Adding Support for a New Platform

1. Add platform to `src/config/platforms.js`:

   ```javascript
   export const PLATFORMS = {
     // ... existing platforms
     'newplatform': 'https://newplatform.com'
   };
   ```

2. If special URL transformation needed, update `transformPath()` in `src/config/platforms.js`

3. Add tests in `test/platforms.test.js` or create `test/newplatform.test.js`

4. Update README.md with platform prefix and examples

### Debugging Cloudflare Workers Locally

- Wrangler provides local development server with hot reload
- Use `console.log()` - output appears in terminal
- Performance metrics available via `X-Performance-Metrics` response header
- Use `npm run dev` and test with `curl` or browser

### Working with Docker/Container Registries

Docker registry protocol requires:

- Authentication flow handling (`/v2/auth` endpoint)
- WWW-Authenticate header parsing
- Token fetching and proxying
- Special MIME types (`application/vnd.docker.distribution.manifest.v2+json`)

See `isDockerRequest()` and Docker-specific logic in `src/index.js:800-850`.

### Handling Git Operations

Git protocol detection checks:

- URL paths: `/info/refs`, `/git-upload-pack`, `/git-receive-pack`
- Query params: `service=git-upload-pack`
- User-Agent: `git/` prefix

Git requests **bypass cache** to ensure real-time data.

## Security Considerations

**Never disable security headers** - they protect against XSS, clickjacking, and MITM attacks.

**Input validation:**

- Always check path length before processing
- Validate platform prefix exists in `PLATFORMS` config
- Sanitize user input to prevent path traversal

**Request method restrictions:**

- Default: GET/HEAD only
- Git operations: also allow POST
- Enforce via `ALLOWED_METHODS` configuration

**CORS policy:**

- Default allows all origins (`*`)
- Can be restricted via `ALLOWED_ORIGINS` environment variable
- Always set appropriate CORS headers

## Deployment Options

**Cloudflare Workers (Primary):**

- Run `npm run deploy` after `wrangler login`
- Configure environment variables in Cloudflare dashboard
- Uses `wrangler.toml` for worker configuration

**Self-hosted (Docker):**

- Multi-stage Dockerfile builds worker with Wrangler
- Runs with `workerd` runtime (Cloudflare's open-source Workers runtime)
- Exposes port 8080
- Uses `config.capnp` for workerd configuration

**EdgeOne Pages (Alternative edge platform):**

- Similar to Cloudflare Workers
- See README.md for deployment instructions

## Performance Optimization

**Key performance features:**

- HTTP/3 support (via Cloudflare)
- Brotli/gzip compression
- Connection keep-alive and pre-warming
- Edge caching with 30-minute default TTL
- Parallel retry logic with linear backoff
- Performance monitoring built-in (`PerformanceMonitor` class)

**Monitoring metrics:**

- `cache_hit` - Successful cache retrieval
- `attempt_N` - Nth retry attempt timestamp
- `success` - Successful upstream fetch
- Response includes `X-Performance-Metrics` with timing data

## Troubleshooting

**Tests failing with "fetch is not defined":**

- Ensure using `@cloudflare/vitest-pool-workers` pool
- Check `vitest.config.js` has correct pool configuration

**Wrangler deployment fails:**

- Run `wrangler login` first
- Check `wrangler.toml` configuration
- Verify Cloudflare account has Workers enabled

**Cache not working:**

- Ensure not testing Git/Docker/AI requests (cache bypassed)
- Check Cloudflare Workers cache API is available (not available in `wrangler dev`)
- Verify HTTP status is 2xx

**Platform URL transformation incorrect:**

- Check `transformPath()` logic in `src/config/platforms.js`
- Add console.log to debug URL construction
- Verify platform prefix matches `PLATFORMS` key
