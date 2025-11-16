# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Xget is a high-performance acceleration engine for developer resources built on Cloudflare Workers. It provides unified acceleration for code repositories, package managers, container registries, AI inference providers, and more. The application proxies requests to various platforms, applies intelligent caching, and implements security measures while maintaining protocol compliance (Git, Docker/OCI, AI APIs).

**Key Features:**

- Multi-platform support (40+ platforms: GitHub, GitLab, npm, PyPI, Docker Hub, OpenAI, etc.)
- Smart caching with protocol-aware strategies (no cache for Git/Docker/AI, 30-min cache for downloads)
- HTTP Range request support for partial downloads
- Container registry authentication proxy
- Retry logic with exponential backoff
- Comprehensive security headers (HSTS, CSP, X-Frame-Options)

## Commands

### Development

```bash
# Start local development server with Wrangler
npm run dev

# Type check without emitting files
npm run type-check
```

### Testing

```bash
# Run all tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report (requires 80% coverage)
npm run test:coverage

# Watch mode
npm run test:watch
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Auto-fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without modifying files
npm run format:check
```

### Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
# or
wrangler deploy

# Start production preview
npm start
```

### Docker Deployment

```bash
# Build and run with Docker
docker build -t xget .
docker run -p 8080:8080 xget

# Or with Podman
podman build -t xget .
podman run -p 8080:8080 xget
```

## Architecture

### Core Components

**`src/index.js`** (1432 lines) - Main request handler

- `handleRequest()` - Core request processor with caching, retry logic, security validation
- `PerformanceMonitor` - Tracks timing metrics throughout request lifecycle
- Protocol detection: Git (git-upload-pack), Git LFS, Docker/OCI (v2 API), AI inference providers
- URL transformation and platform routing
- Docker registry authentication proxy (token fetch, WWW-Authenticate handling)
- Response rewriting for protocol compliance

**`src/config/index.js`** (180 lines) - Configuration management

- `createConfig(env)` - Creates config with environment variable overrides
- `CONFIG` - Default config object
- Settings: timeout (30s), retries (3), cache duration (1800s), security rules

**`src/config/platforms.js`** (395 lines) - Platform definitions

- `PLATFORMS` - Maps 40+ platform prefixes to base URLs
  - Code repos: `gh`, `gl`, `gitea`, `codeberg`, `sf`, `aosp`, `hf`, `civitai`
  - Package managers: `npm`, `pypi`, `conda`, `maven`, `gradle`, `rubygems`, `cran`, `cpan`, `golang`, `nuget`, `crates`, `packagist`
  - Linux distros: `debian`, `ubuntu`, `fedora`, `rocky`, `opensuse`, `arch`
  - AI providers: `ip-openai`, `ip-anthropic`, `ip-gemini`, etc. (prefix: `ip-`)
  - Container registries: `cr-docker`, `cr-ghcr`, `cr-gcr`, etc. (prefix: `cr-`)
- `transformPath()` - Converts prefixed URLs to actual platform URLs

### Request Flow

```
1. Receive request → Validate security (method, path length, origin)
2. Detect protocol → Git/Git LFS/Docker/AI/Standard
3. Parse URL → Extract platform prefix and path
4. Transform → Convert to actual platform URL via PLATFORMS config
5. Cache check → Skip for Git/Docker/AI protocols
6. Fetch upstream → With timeout, retries, exponential backoff
7. Handle auth → Docker token proxy for container registries
8. Rewrite response → Docker Content-Digest, URL rewriting
9. Add headers → Security headers, performance metrics, CORS
10. Cache → Store successful responses (protocol-dependent)
11. Return → Final response with all headers
```

### Caching Strategy

- **No cache:** Git operations, Git LFS, Docker/OCI registry, AI inference APIs
- **30-min cache:** Standard file downloads, package registry files
- **Range requests:** Cache full content when partial range requested
- Cache key: Full request URL including query parameters

### Testing Structure

- `test/index.test.js` - Core handler tests
- `test/platforms.test.js` - Platform URL transformation tests
- `test/integration.test.js` - End-to-end integration tests
- `test/security.test.js` - Security validation tests
- `test/performance.test.js` - Performance benchmarking
- `test/container-registry.test.js` - Docker/OCI registry tests
- `test/range-cache.test.js` - HTTP Range request tests
- `test/setup.js` - Global test configuration
- `test/helpers/` - Test utilities
- `test/fixtures/` - Test data

**Test configuration:**

- Framework: Vitest with Cloudflare Workers pool (`@cloudflare/vitest-pool-workers`)
- Coverage: 80% minimum (branches, functions, lines, statements)
- Timeout: 30 seconds per test
- Retries: 2 attempts

## Code Style

**ESLint configuration (eslint.config.js):**

- 2-space indentation
- Single quotes for strings
- Semicolons required
- Camelcase naming (except properties)
- No trailing spaces
- Unix line endings
- No `var`, use `const` or `let`
- Prefer arrow functions and template literals

**Naming conventions:**

- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Classes: `PascalCase`
- Files: `kebab-case` (though this repo uses `.js` files)

**JSDoc comments required:**

- All functions must have JSDoc with `@param`, `@returns`, `@throws`
- Include `@example` blocks for non-trivial functions
- Extensive inline comments for complex logic

## Environment Variables

Configure via Cloudflare Workers environment or `.dev.vars`:

- `TIMEOUT_SECONDS` - Request timeout (default: 30)
- `MAX_RETRIES` - Max retry attempts (default: 3)
- `RETRY_DELAY_MS` - Retry delay (default: 1000)
- `CACHE_DURATION` - Cache TTL in seconds (default: 1800)
- `ALLOWED_METHODS` - Comma-separated HTTP methods (default: 'GET,HEAD')
- `ALLOWED_ORIGINS` - Comma-separated CORS origins (default: '*')
- `MAX_PATH_LENGTH` - Max URL path length (default: 2048)

## Platform Support

### Adding New Platforms

1. Edit `src/config/platforms.js`:

   ```javascript
   export const PLATFORMS = {
     // ... existing platforms
     'new-prefix': 'https://platform-url.com'
   };
   ```

2. Add URL transformation logic in `transformPath()` if needed (for special path handling)

3. Add tests in `test/platforms.test.js`:

   ```javascript
   it('should transform new-prefix URLs', () => {
     const result = transformPath('new-prefix/path/to/resource');
     expect(result).toBe('https://platform-url.com/path/to/resource');
   });
   ```

4. Update README.md with platform badge and usage instructions

### Platform Categories

- **Code repositories:** Direct path passthrough
- **Package managers:** May require special path handling (e.g., npm scoped packages)
- **Container registries (cr- prefix):** Docker/OCI protocol, authentication proxy
- **AI providers (ip- prefix):** No caching, streaming support

## Security Considerations

- All GPLv3 licensed - include license header in new files
- Validate HTTP methods (allow POST for Git operations)
- Path length limits (2048 chars default)
- Security headers applied to all responses
- No XSS or injection vulnerabilities - all URLs validated
- Docker auth tokens proxied securely (never stored)
- CORS headers configurable per deployment

## Deployment Targets

1. **Cloudflare Workers** (primary): Zero-config deployment with global edge network
2. **Docker/Podman**: Self-hosted with workerd runtime (see Dockerfile)
3. **Local development**: Wrangler dev server on localhost

## License

GPLv3 - All new source files must include the GPL header (see existing files for template).
