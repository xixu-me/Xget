/**
 * Request validation utilities for Xget
 */

import { CONFIG } from '../config/index.js';

// Imported protocol checks
import { isAIInferenceRequest } from '../protocols/ai.js';
import { isGitLFSRequest, isGitRequest } from '../protocols/git.js';

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
 */
export function isDockerRequest(request, url) {
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

// Re-export for standard usage
export { isAIInferenceRequest, isGitLFSRequest, isGitRequest };

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
 * @param {import('../config/index.js').ApplicationConfig} config - Configuration object
 * @returns {{valid: boolean, error?: string, status?: number}} Validation result object
 */
export function validateRequest(request, url, config = CONFIG) {
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
