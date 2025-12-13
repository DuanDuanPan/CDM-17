import { exec } from 'child_process';

let apiProcess: ReturnType<typeof exec> | null = null;

async function waitForHealth(url = 'http://127.0.0.1:4000/health', retries = 60, intervalMs = 500) {
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
  // Prefer reusing an existing server to avoid port conflicts.
  try {
    await waitForHealth();
    return;
  } catch {
    // continue starting a local dev server
  }

  apiProcess = exec('pnpm --filter @cdm/api dev', {
    env: { ...process.env, WS_EDITOR_TOKEN: process.env.WS_EDITOR_TOKEN || 'test-token' },
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
