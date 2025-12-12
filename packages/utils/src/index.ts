export const throttle = <T extends (...args: unknown[]) => unknown>(fn: T, wait = 100) => {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      return fn(...args);
    }
    return undefined;
  };
};

export const retry = async <T>(fn: () => Promise<T>, times = 3): Promise<T> => {
  let attempt = 0;
  let error: unknown;
  while (attempt < times) {
    try {
      return await fn();
    } catch (err) {
      error = err;
      attempt += 1;
      await new Promise((res) => setTimeout(res, attempt * 50));
    }
  }
  throw error;
};
