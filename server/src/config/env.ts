import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { serverEnvSchema, type ServerEnv } from '@lumaspend/shared';

// Ensure .env is loaded from the server directory or monorepo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function loadValidatedEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');

    console.error('\n❌ Fatal: Invalid or missing server environment configuration:');
    console.error(issues);
    console.error('\nPlease verify server/.env against server/.env.example.\n');

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  return result.success ? result.data : (serverEnvSchema.parse({}) as ServerEnv);
}

export const env: ServerEnv = loadValidatedEnv();
