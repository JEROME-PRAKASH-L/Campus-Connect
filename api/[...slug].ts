// Serverless entry for the Vercel deployment.
//
// Vercel serves the static frontend (apps/web/out) and the functions in this
// directory from the same deployment, so the browser calls /api/... on its own
// origin — no second project, no cross-origin requests, and no API base URL to
// configure.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../apps/api/src/app.js';

/**
 * Filesystem routing alone only delivered single-segment paths here: /api/health
 * and /api/dashboard reached the function, while /api/auth/demo-accounts fell
 * through to the static output and 404'd. A rewrite in vercel.json catches every
 * depth, but rewriting replaces the path the function sees — which is the one
 * thing the Express routers depend on.
 *
 * So the rewrite carries the original path in `__path`, and it is restored here
 * before Express looks at the request. If the request arrives without `__path`
 * (direct filesystem routing), the URL is already correct and is left alone.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const originalPath = requestUrl.searchParams.get('__path');

  if (originalPath) {
    requestUrl.searchParams.delete('__path');
    const query = requestUrl.searchParams.toString();
    req.url = query ? `${originalPath}?${query}` : originalPath;
  }

  return (app as unknown as (rq: IncomingMessage, rs: ServerResponse) => void)(req, res);
}
