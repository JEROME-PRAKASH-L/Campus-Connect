import { createApp } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './database/prisma.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Campus Connect API listening on http://localhost:${env.port} (${env.nodeEnv}, storage: ${env.storage.driver})`);
});

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`\n${signal} received — closing the Campus Connect API.`);
  server.close(() => {
    void disconnectPrisma().finally(() => process.exit(0));
  });
  // Do not let a hung connection keep the process alive indefinitely.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
