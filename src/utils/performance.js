/**
 * Performance monitoring utilities for Xget
 */

import { addSecurityHeaders } from './security.js';

/**
 * Monitors performance metrics during request processing.
 *
 * This class tracks timing information throughout request handling lifecycle,
 * allowing measurement of cache hits, upstream fetch attempts, and total processing time.
 */
export class PerformanceMonitor {
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
   */
  getMetrics() {
    return Object.fromEntries(this.marks.entries());
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
 */
export function addPerformanceHeaders(response, monitor) {
  const headers = new Headers(response.headers);
  headers.set('X-Performance-Metrics', JSON.stringify(monitor.getMetrics()));
  addSecurityHeaders(headers);
  return new Response(response.body, {
    status: response.status,
    headers
  });
}
