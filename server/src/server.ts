import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';

export function startServer(): http.Server {
  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    console.log(`\n==============================================`);
    console.log(`🚀 LumaSpend API Server online on port ${env.PORT}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
    console.log(`🩺 Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`==============================================\n`);
  });

  const handleTermination = (signal: string) => {
    console.log(`\n[${signal}] Initiating graceful shutdown...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleTermination('SIGTERM'));
  process.on('SIGINT', () => handleTermination('SIGINT'));

  return server;
}
