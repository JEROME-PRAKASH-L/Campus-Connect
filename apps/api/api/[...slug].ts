// Vercel serverless entry point.
//
// An Express app is itself a `(req, res)` handler, so exporting it is all the
// @vercel/node runtime needs.
//
// This is a catch-all under `api/`, so every `/api/...` request lands here with
// its original URL intact and the routers mounted in `src/app.ts` match exactly
// as they do locally. Filesystem routing is used deliberately in preference to
// a `rewrites` rule, which would rewrite the path out from under Express.
import { app } from '../src/app.js';

export default app;
