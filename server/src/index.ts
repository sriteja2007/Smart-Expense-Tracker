import { startServer } from './server.js';

startServer().catch((err) => {
  console.error('Fatal: Failed to start LumaSpend API Server:', err);
  process.exit(1);
});
