// Unified Vercel entry point for the repository-root deployment.
//
// The frontend is exported as static files, while this catch-all function
// serves the existing Express API on the same domain. Keeping the original
// `/api/...` URL intact means the routers in apps/api/src/app.ts work without
// any path rewriting.
import { app } from '../apps/api/src/app.js';

export default app;
