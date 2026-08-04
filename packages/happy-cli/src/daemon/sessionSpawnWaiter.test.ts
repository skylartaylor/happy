import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSessionSpawnWaiter, SESSION_START_TIMEOUT_MS } from './sessionSpawnWaiter';

describe('createSessionSpawnWaiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the 60-second session API request to finish', () => {
    expect(SESSION_START_TIMEOUT_MS).toBeGreaterThan(60_000);
  });

  it('resolves when the child reports its Happy session id', async () => {
    const onSettled = vi.fn();
    const waiter = createSessionSpawnWaiter({
      timeoutMs: 1_000,
      timeoutErrorMessage: 'timed out',
      onSettled,
    });

    expect(waiter.started('happy-session')).toBe(true);
    await expect(waiter.promise).resolves.toEqual({
      type: 'success',
      sessionId: 'happy-session',
    });
    expect(onSettled).toHaveBeenCalledOnce();
  });

  it('fails immediately when the child exits before reporting a session', async () => {
    const waiter = createSessionSpawnWaiter({
      timeoutMs: 1_000,
      timeoutErrorMessage: 'timed out',
    });

    expect(waiter.failed('child exited with code 1')).toBe(true);
    await expect(waiter.promise).resolves.toEqual({
      type: 'error',
      errorMessage: 'child exited with code 1',
    });
  });

  it('uses the configured timeout and ignores a late webhook', async () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const waiter = createSessionSpawnWaiter({
      timeoutMs: 75_000,
      timeoutErrorMessage: 'session start timed out',
      onTimeout,
    });

    await vi.advanceTimersByTimeAsync(75_000);

    await expect(waiter.promise).resolves.toEqual({
      type: 'error',
      errorMessage: 'session start timed out',
    });
    expect(onTimeout).toHaveBeenCalledOnce();
    expect(waiter.started('late-session')).toBe(false);
  });

  it('settles only once when exit and webhook race', async () => {
    const waiter = createSessionSpawnWaiter({
      timeoutMs: 1_000,
      timeoutErrorMessage: 'timed out',
    });

    expect(waiter.failed('child exited')).toBe(true);
    expect(waiter.started('too-late')).toBe(false);
    await expect(waiter.promise).resolves.toEqual({
      type: 'error',
      errorMessage: 'child exited',
    });
  });
});
