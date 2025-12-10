/**
 * AI Inference protocol handler for Xget
 */

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
 */
export function isAIInferenceRequest(request, url) {
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
 * Configures headers for AI protocol requests.
 *
 * Sets Content-Type and User-Agent headers for AI inference requests.
 *
 * @param {Headers} headers - The headers object to modify
 * @param {Request} request - The original request
 */
export function configureAIHeaders(headers, request) {
  if (request.method === 'POST' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'Xget-AI-Proxy/1.0');
  }
}
