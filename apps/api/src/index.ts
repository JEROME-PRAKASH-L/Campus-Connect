import { app } from './app.js';
import { env } from './env.js';

// Local / long-running server entry. On Vercel the app is served by
// `api/index.ts` as a serverless function instead, and this file is not used.
app.listen(env.port, () => {
  console.log(`Campus Connect API listening on http://localhost:${env.port}`);
});
