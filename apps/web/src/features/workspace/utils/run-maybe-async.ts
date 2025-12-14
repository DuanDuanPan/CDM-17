export function runMaybeAsync(action: () => void | Promise<void>, onError?: (err: unknown) => void) {
  try {
    const result = action();
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch((err) => {
        if (onError) onError(err);
        else console.warn('async action failed', err);
      });
    }
  } catch (err) {
    if (onError) onError(err);
    else console.warn('action failed', err);
  }
}

