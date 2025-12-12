import { exec } from 'child_process';

let apiProcess: ReturnType<typeof exec> | null = null;

async function waitForHealth(url = 'http://localhost:4000/health', retries = 10, intervalMs = 300) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // ignore
    }
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error('API health check failed');
}

async function globalSetup() {
  // Start API server if not already running
  apiProcess = exec('pnpm --filter @cdm/api dev --host 0.0.0.0 --port 4000', {
    env: { ...process.env },
  });
  await waitForHealth();
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
