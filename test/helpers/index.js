/**
 * Test helpers - centralized exports
 */

// Re-export all utilities
export * from './assertions.js';
export * from './generators.js';
export * from './mocks.js';

/**
 * Performance test utilities
 */
export class PerformanceTestHelper {
  constructor() {
    this.measurements = [];
  }

  /**
   * Measure execution time of an async function
   * @param {Function} fn - Async function to measure
   * @param {string} name - Measurement name
   * @returns {Promise<any>} Function result
   */
  async measure(fn, name = 'operation') {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    this.measurements.push({
      name,
      duration: end - start,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Get all measurements
   * @returns {Array} Array of measurements
   */
  getMeasurements() {
    return [...this.measurements];
  }

  /**
   * Get average duration for a specific measurement name
   * @param {string} name - Measurement name
   * @returns {number} Average duration in milliseconds
   */
  getAverageDuration(name) {
    const filtered = this.measurements.filter(m => m.name === name);
    if (filtered.length === 0) {
      return 0;
    }

    const total = filtered.reduce((sum, m) => sum + m.duration, 0);
    return total / filtered.length;
  }

  /**
   * Clear all measurements
   */
  clear() {
    this.measurements = [];
  }
}

/**
 * Test timeout helper
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Promise that rejects after timeout
 */
export function timeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Test timed out after ${ms}ms`)), ms);
  });
}

/**
 * Wait for a specified amount of time
 * @param {number} ms - Time to wait in milliseconds
 * @returns {Promise} Promise that resolves after the specified time
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
