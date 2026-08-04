// Serverless entry for the Vercel deployment.
//
// Vercel serves the static frontend (apps/web/out) and the functions in this
// directory from the same deployment, so the browser calls /api/... on its own
// origin — no second project, no cross-origin requests, and no API base URL to
// configure.
//
// An Express app is itself a (req, res) handler, so exporting it is all the
// runtime needs. This is a catch-all, so every /api/* path arrives with its
// original URL and the routers in apps/api/src/app.ts match exactly as they do
// when the API runs as a standalone server.
import { app } from '../apps/api/src/app.js';

export default app;
