/**
 * Netlify Edge Function entry point.
 *
 * This file serves as a redirect to the edge function handler
 * located at /api/index.js. Both Netlify and Vercel can use the same
 * handler code, with platform detection handling the differences.
 *
 * Netlify requires edge functions to be in netlify/edge-functions/,
 * while Vercel uses /api/ directory. This approach maintains a single
 * source of truth at /api/index.js.
 */
export { config, default } from '../../api/index.js';

