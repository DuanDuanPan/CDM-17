import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
let apiProcess: ReturnType<typeof exec> | null = null;

async function globalSetup() {
  // Start API server if not already running
  apiProcess = exec('pnpm --filter @cdm/api dev --host 0.0.0.0 --port 4000', {
    env: { ...process.env },
  });

  // Wait a bit for server to boot
  await new Promise((res) => setTimeout(res, 1500));
}

async function globalTeardown() {
  if (apiProcess?.pid) {
    apiProcess.kill('SIGTERM');
  }
}

export default async () => {
  await globalSetup();
  return globalTeardown;
};
