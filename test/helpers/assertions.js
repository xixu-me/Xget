/**
 * Custom assertions and validation helpers
 */

/**
 * Validate response headers for security
 * @param {Response} response - Response to validate
 * @returns {Object} Validation results
 */
export function validateSecurityHeaders(response) {
  const requiredHeaders = [
    'Strict-Transport-Security',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Content-Security-Policy',
    'Referrer-Policy'
  ];

  const results = {
    passed: true,
    missing: [],
    present: []
  };

  requiredHeaders.forEach(header => {
    if (response.headers.has(header)) {
      results.present.push(header);
    } else {
      results.missing.push(header);
      results.passed = false;
    }
  });

  return results;
}

/**
 * Assert that a URL is valid
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Assert that response has security headers
 * @param {Response} response - Response to check
 * @returns {boolean} True if has all security headers
 */
export function hasSecurityHeaders(response) {
  const validation = validateSecurityHeaders(response);
  return validation.passed;
}
