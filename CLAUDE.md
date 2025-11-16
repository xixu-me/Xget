# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Xget** is a high-performance acceleration engine for developer resources deployed on Cloudflare Workers. It acts as a unified proxy/acceleration layer for 40+ platforms including code repositories (GitHub, GitLab, Gitea), package managers (npm, PyPI, conda, Maven, etc.), AI inference providers (OpenAI, Anthropic, Gemini), container registries (Docker Hub, GHCR), and Linux distributions.

**Primary purpose**: Accelerate access to developer resources for users in regions with connectivity challenges, particularly mainland China.

## Technology Stack

- **Runtime**: Cloudflare Workers (serverless edge computing)
- **Language**: JavaScript (ES2022) with JSDoc type annotations
- **Testing**: Vitest with `@cloudflare/vitest-pool-workers`
- **Deployment**: Wrangler CLI + GitHub Actions
- **Code Quality**: ESLint + Prettier
- **Type Checking**: TypeScript via JSDoc (no build step)

## Development Commands

```bash
# Development
npm run dev          # Start Wrangler dev server (same as npm start)

# Testing
npm test             # Run Vitest in watch mode
npm run test:run     # Run tests once (CI mode)
npm run test:coverage # Run tests with coverage report
npm run test:ui      # Open Vitest UI

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors automatically
npm run format       # Format code with Prettier
npm run format:check # Check formatting without changes
npm run type-check   # TypeScript/JSDoc type checking (no emit)

# Deployment
npm run deploy       # Deploy to Cloudflare Workers
```

## Architecture

### Core Components

1. **Main Request Handler** ([src/index.js](src/index.js))
   - Entry point with `fetch()` event handler
   - Protocol detection (Git, Git LFS, Docker, AI inference)
   - Request validation, retry logic, timeout handling
   - Performance monitoring (`PerformanceMonitor` class)
   - Security header management

2. **Configuration** ([src/config/index.js](src/config/index.js))
   - `createConfig(env)` - runtime config with environment overrides
   - `CONFIG` object with defaults (cache TTL, timeouts, retries)

3. **Platform Definitions** ([src/config/platforms.js](src/config/platforms.js))
   - `PLATFORMS` object mapping prefixes to base URLs (40+ entries)
   - `transformPath()` function for URL transformations
   - Platform-specific special cases (crates.io API, Jenkins paths, etc.)

### Request Flow

```
Request → Validate → Detect Protocol → Transform URL → Check Cache
  → Fetch Upstream (with retries) → Handle Docker Auth → Rewrite Response
  → Add Security Headers → Cache → Return with Performance Metrics
```

### Protocol Detection

The system handles different protocols with specialized logic:

- **Git requests**: Via `/info/refs`, `/git-upload-pack` endpoints, User-Agent patterns
- **Git LFS**: LFS-specific headers and endpoints
- **Docker/OCI registries**: `/v2/` prefix, Docker headers, token auth flow
- **AI inference**: `/ip/` prefix for AI API proxying
- **Regular downloads**: Default behavior with intelligent caching

### Security Features

All responses include security headers:

- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options: DENY`
- `X-XSS-Protection`
- `Content-Security-Policy`
- `Referrer-Policy`
- `Permissions-Policy`

Request validation:

- Method whitelist (GET/HEAD default, POST/PUT/PATCH for Git/Docker/AI)
- Path length limit (2048 characters)
- 30-second timeout protection

### Caching Strategy

- **Cache bypass**: Git, Git LFS, Docker, AI inference requests skip cache
- **Cache TTL**: 1800 seconds (30 minutes) default
- **Range requests**: Full support for HTTP 206 partial content
- **Smart cache keys**: Different keys for Range vs full-content requests

### Content Transformation

- **PyPI URLs**: Rewrites `files.pythonhosted.org` URLs in HTML responses
- **npm URLs**: Rewrites tarball URLs in JSON registry responses
- **Streaming**: Uses `ReadableStream` for efficient large file handling

## Testing

### Test Structure

Tests are organized by functionality in `test/`:

- `index.test.js` - Core request handling
- `integration.test.js` - End-to-end platform tests
- `security.test.js` - Security headers and validation
- `performance.test.js` - Performance monitoring
- `platforms.test.js` - URL transformation logic
- `container-registry.test.js` - Docker/OCI registry flows
- `range-cache.test.js` - HTTP Range requests
- Platform-specific: `npm-fix.test.js`, `crates.test.js`, `homebrew.test.js`, `opensuse.test.js`, `cran.test.js`, `jenkins.test.js`

### Coverage Requirements

Minimum 80% coverage for:

- Branches
- Functions
- Lines
- Statements

### Running Specific Tests

```bash
# Run specific test file
npm test -- index.test.js

# Run tests matching pattern
npm test -- --grep "Docker"

# Run with coverage
npm run test:coverage
```

## Code Style

- **JSDoc annotations**: All functions must have JSDoc type annotations
- **ES modules**: Use `import/export`, not `require()`
- **Async/await**: Prefer over Promise chains
- **Error handling**: All fetch operations must have retry logic and timeout protection

## Important Patterns

### Adding a New Platform

1. Add entry to `PLATFORMS` object in [src/config/platforms.js](src/config/platforms.js):

   ```js
   'prefix': 'https://example.com'
   ```

2. If special URL transformation needed, add case in `transformPath()`:

   ```js
   if (platform === 'prefix' && /* condition */) {
     // Custom transformation
   }
   ```

3. Add integration test in [test/integration.test.js](test/integration.test.js)

4. Update README.md with usage examples

### Retry Logic Pattern

All upstream fetches use:

```js
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    // Fetch with AbortController for timeout
    const response = await fetch(url, { signal: controller.signal });
    // Handle response
    break;
  } catch (error) {
    // Only retry on 5xx or network errors, not 4xx
    if (attempt === maxRetries || isClientError(response)) throw error;
  }
}
```

### Performance Monitoring

Use `PerformanceMonitor` class to track timing:

```js
const perfMon = new PerformanceMonitor();
perfMon.mark('operation_start');
// ... do work ...
perfMon.mark('operation_complete');
const metrics = perfMon.getMetrics(); // Returns timing data
```

## Deployment

- **Target**: Cloudflare Workers
- **Config**: [wrangler.toml](wrangler.toml)
- **CI/CD**: GitHub Actions ([.github/workflows/depoly.yml](.github/workflows/depoly.yml))
- **Secrets required**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## Environment Variables

Configuration can be overridden via Cloudflare Workers environment variables:

- `CACHE_TTL` - Cache time-to-live in seconds (default: 1800)
- `MAX_RETRIES` - Maximum retry attempts (default: 3)
- `TIMEOUT` - Request timeout in milliseconds (default: 30000)
- Platform-specific base URLs can be overridden by setting env var matching platform key

## Key Files to Reference

- [src/index.js](src/index.js) - Main application logic (~900 lines)
- [src/config/platforms.js](src/config/platforms.js) - All platform definitions and transformations
- [src/config/index.js](src/config/index.js) - Configuration management
- [wrangler.toml](wrangler.toml) - Cloudflare Workers deployment config
- [vitest.config.js](vitest.config.js) - Test configuration
