# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Xget is a high-performance, secure acceleration engine for developer resources, built on Cloudflare Workers. It provides a unified proxy for accessing code repositories, package managers, AI inference APIs, container registries, and more with enhanced performance through Cloudflare's global edge network.

**Key Features:**

- Multi-platform support (50+ platforms including GitHub, npm, PyPI, Docker registries, AI APIs)
- Intelligent caching with 30-minute default TTL
- Automatic retry mechanism (3 retries with linear backoff)
- Enterprise-grade security headers
- HTTP/3 and multi-compression support
- Special handling for Git, Docker, and AI inference protocols

## Development Commands

### Testing

- `npm test` - Run all tests with Vitest (uses Cloudflare Workers test environment)
- `npm run test:run` - Run tests once without watch mode
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:coverage` - Generate test coverage report (80% threshold for branches/functions/lines/statements)

### Code Quality

- `npm run lint` - Run ESLint on src/ and test/ directories
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting without making changes
- `npm run type-check` - Run TypeScript type checking (noEmit mode)

### Development & Deployment

- `npm run dev` or `npm start` - Start local development server with Wrangler
- `npm run deploy` - Deploy to Cloudflare Workers

## Architecture

### Request Flow

1. **Request Reception** ([src/index.js](src/index.js):275-806) - `handleRequest()` is the main entry point
2. **Validation** ([src/index.js](src/index.js):155-175) - Security validation via `validateRequest()`
3. **Platform Detection** ([src/index.js](src/index.js):320-338) - Identifies platform from URL prefix
4. **Path Transformation** ([src/config/platforms.js](src/config/platforms.js):99-191) - Converts proxy path to target platform path
5. **Cache Check** ([src/index.js](src/index.js):379-409) - Checks Cloudflare cache (skipped for Git/Docker/AI)
6. **Upstream Fetch** ([src/index.js](src/index.js):519-662) - Fetches from origin with retry logic
7. **Response Processing** ([src/index.js](src/index.js):689-724) - URL rewriting for npm/PyPI responses
8. **Cache Storage** ([src/index.js](src/index.js):762-795) - Stores successful 200 responses in cache

### Core Components

**[src/index.js](src/index.js)** - Main worker logic

- `handleRequest()` - Primary request handler with caching, retries, security
- `isGitRequest()`, `isDockerRequest()`, `isAIInferenceRequest()` - Protocol detection functions
- `validateRequest()` - Security validation (method whitelist, path length limits)
- `PerformanceMonitor` - Tracks request performance metrics
- Docker authentication handling ([src/index.js](src/index.js):219-266, 354-371, 579-634)

**[src/config/platforms.js](src/config/platforms.js)** - Platform definitions and URL transformations

- `PLATFORMS` object - Maps platform keys to base URLs (50+ platforms)
- `transformPath()` - Unified path transformation logic for all platforms
- Special transformations for crates.io, Homebrew, Jenkins

**[src/config/index.js](src/config/index.js)** - Configuration management

- `createConfig()` - Merges environment variables with defaults
- Default values: 30s timeout, 3 retries, 1800s cache, 2048 char max path length

### Platform Categories

1. **Code Repositories**: gh (GitHub), gl (GitLab), gitea, codeberg, sf (SourceForge), aosp
2. **Package Managers**: npm, pypi, conda, maven, gradle, nuget, crates, etc.
3. **Container Registries**: cr-docker (Docker Hub), cr-ghcr, cr-gcr, cr-mcr, cr-quay, etc. (prefixed with `cr-`)
4. **AI Inference Providers**: ip-openai, ip-anthropic, ip-gemini, etc. (prefixed with `ip-`)
5. **Model/Dataset Platforms**: hf (Hugging Face), civitai
6. **Linux Distributions**: debian, ubuntu, fedora, arch, etc.

### Special Handling

**Git Operations** ([src/index.js](src/index.js):73-102)

- Detected via User-Agent, endpoints (`/info/refs`, `/git-upload-pack`, `/git-receive-pack`), or query params
- Allows POST method, sets Git-specific headers
- Skips caching to ensure real-time data

**Git LFS (Large File Storage) Operations** ([src/index.js](src/index.js):104-141)

- Detected via LFS-specific endpoints (`/info/lfs`, `/objects/batch`, `/objects/{oid}`)
- Detected via LFS headers (`Accept: application/vnd.git-lfs+json`) or User-Agent (`git-lfs/`)
- Supports batch API for efficient object transfers
- Sets appropriate content-type headers for LFS operations
- Skips caching to ensure real-time data synchronization

**Docker/Container Registries** ([src/index.js](src/index.js):42-65)

- Detected via `/v2/` paths, User-Agent, or Accept headers
- Handles Docker authentication flow with token fetching
- Supports anonymous access to public repositories
- All requests must use `/cr/` prefix (e.g., `/cr/ghcr/owner/repo`)
- **Docker Hub Special Handling** ([src/index.js](src/index.js):600-604): Official images (single-name like `nginx`) are automatically prefixed with `library/` for authentication scope, while user images (namespace/image) are passed through unchanged

**AI Inference APIs** ([src/index.js](src/index.js):110-146)

- Detected via `/ip/` paths or common AI endpoints
- Allows POST/PUT/PATCH methods
- Sets JSON content-type and preserves all request headers
- Skips caching for real-time inference

**URL Rewriting** ([src/index.js](src/index.js):689-724)

- PyPI: Rewrites `files.pythonhosted.org` URLs to go through `/pypi/files`
- npm: Rewrites `registry.npmjs.org` tarball URLs to go through `/npm/`

## Testing Practices

- Tests use Cloudflare Workers test environment via `@cloudflare/vitest-pool-workers`
- Use `SELF.fetch()` to make requests to the worker in tests
- Test files are organized by functionality: platforms, security, integration, performance, range-cache
- Fixtures in [test/fixtures/responses.js](test/fixtures/responses.js)
- Test utilities in [test/helpers/test-utils.js](test/helpers/test-utils.js)

## Configuration

Runtime configuration can be overridden via Cloudflare Workers environment variables:

- `TIMEOUT_SECONDS` - Request timeout (default: 30)
- `MAX_RETRIES` - Max retry attempts (default: 3)
- `RETRY_DELAY_MS` - Delay between retries (default: 1000)
- `CACHE_DURATION` - Cache TTL in seconds (default: 1800)
- `ALLOWED_METHODS` - Comma-separated HTTP methods (default: GET,HEAD)
- `MAX_PATH_LENGTH` - Maximum URL path length (default: 2048)

## Adding New Platforms

To add a new platform:

1. Add entry to `PLATFORMS` object in [src/config/platforms.js](src/config/platforms.js)
2. Add path transformation logic in `transformPath()` if needed (most platforms don't need special handling)
3. Update tests in [test/platforms.test.js](test/platforms.test.js)
4. For platforms requiring special protocol handling (like Git/Docker), add detection function in [src/index.js](src/index.js)

## Security Considerations

- All responses include strict security headers (HSTS, X-Frame-Options, CSP, etc.)
- HTTP method whitelist enforced (except for Git/Docker/AI operations)
- Path length validation to prevent excessively long URLs
- 30-second request timeout to prevent resource exhaustion
- Input sanitization in URL transformations
