/**
 * Type declarations for cloudflare:test module
 * Based on @cloudflare/vitest-pool-workers
 */

declare module 'cloudflare:test' {
  /**
   * Service binding to the default export defined in the `main` worker
   */
  export const SELF: {
    fetch(request: RequestInfo, init?: RequestInit): Promise<Response>;
    fetch(url: string, init?: RequestInit): Promise<Response>;
  };

  /**
   * Creates an instance of ExecutionContext for use in tests
   */
  export function createExecutionContext(): ExecutionContext;

  /**
   * Waits for all ExecutionContext.waitUntil() promises to settle
   */
  export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
}
