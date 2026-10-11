import http from 'http';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';

export async function startServer(): Promise<http.Server> {
  const app = createApp();
  const server = http.createServer(app);

  // Connect to MongoDB Atlas if URI is provided
  if (env.MONGODB_URI && env.NODE_ENV !== 'test') {
    try {
      console.log('📡 Connecting to MongoDB Atlas...');
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000
      });
      console.log('✅ Connected to MongoDB Atlas successfully.');
    } catch (error) {
      console.warn('⚠️  MongoDB connection failed. Continuing in resilient memory-store mode.');
      console.warn(`   Detail: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  server.listen(env.PORT, () => {
    console.log(`\n==============================================`);
    console.log(`🚀 LumaSpend API Server online on port ${env.PORT}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
    console.log(`🩺 Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`==============================================\n`);
  });

  const handleTermination = async (signal: string) => {
    console.log(`\n[${signal}] Initiating graceful shutdown...`);
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
        console.log('MongoDB connection cleanly closed.');
      }
    } catch (err) {
      console.error('Error during database disconnection:', err);
    }
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void handleTermination('SIGTERM'));
  process.on('SIGINT', () => void handleTermination('SIGINT'));

  return server;
}
