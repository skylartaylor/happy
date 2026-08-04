import type { SpawnSessionResult } from '@/modules/common/registerCommonHandlers';

// Session creation may spend up to 60 seconds in the initial API request before
// the offline recovery loop can register the session with the daemon.
export const SESSION_START_TIMEOUT_MS = 75_000;

export type SessionSpawnWaiter = {
  promise: Promise<SpawnSessionResult>;
  started: (sessionId: string) => boolean;
  failed: (errorMessage: string) => boolean;
};

export function createSessionSpawnWaiter({
  timeoutMs = SESSION_START_TIMEOUT_MS,
  timeoutErrorMessage,
  onTimeout,
  onSettled,
}: {
  timeoutMs?: number;
  timeoutErrorMessage: string;
  onTimeout?: () => void;
  onSettled?: () => void;
}): SessionSpawnWaiter {
  let resolvePromise!: (result: SpawnSessionResult) => void;
  let settled = false;

  const promise = new Promise<SpawnSessionResult>((resolve) => {
    resolvePromise = resolve;
  });

  const timeout = setTimeout(() => {
    onTimeout?.();
    settle({ type: 'error', errorMessage: timeoutErrorMessage });
  }, timeoutMs);

  const settle = (result: SpawnSessionResult): boolean => {
    if (settled) {
      return false;
    }
    settled = true;
    clearTimeout(timeout);
    onSettled?.();
    resolvePromise(result);
    return true;
  };

  return {
    promise,
    started: (sessionId) => settle({ type: 'success', sessionId }),
    failed: (errorMessage) => settle({ type: 'error', errorMessage }),
  };
}
