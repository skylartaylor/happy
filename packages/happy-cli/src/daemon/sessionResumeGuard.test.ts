import { describe, expect, it, vi } from 'vitest';

import type { TrackedSession } from './types';
import { findActiveTrackedSession, runGuardedSessionResume } from './sessionResumeGuard';

describe('session resume guard', () => {
  it('finds a resumed child before its startup webhook arrives', () => {
    const active = {
      happySessionId: 'session-1',
      happySessionMetadataFromLocalWebhook: undefined,
    } as TrackedSession;

    expect(findActiveTrackedSession([active], 'session-1')).toBe(active);
    expect(findActiveTrackedSession([active], 'session-2')).toBeUndefined();
  });

  it('coalesces concurrent resumes for the same session', async () => {
    const inFlight = new Map<string, Promise<string>>();
    let release!: (value: string) => void;
    const resume = vi.fn(() => new Promise<string>((resolve) => {
      release = resolve;
    }));

    const first = runGuardedSessionResume(inFlight, 'session-1', () => undefined, resume);
    const second = runGuardedSessionResume(inFlight, 'session-1', () => undefined, resume);
    await Promise.resolve();

    expect(resume).toHaveBeenCalledTimes(1);
    release('resumed');
    await expect(Promise.all([first, second])).resolves.toEqual(['resumed', 'resumed']);
    expect(inFlight.has('session-1')).toBe(false);
  });

  it('still finds a live child after its startup wait returns an error', async () => {
    const inFlight = new Map<string, Promise<{ type: 'error' }>>();
    const active = {
      happySessionId: 'session-1',
      happySessionMetadataFromLocalWebhook: undefined,
    } as TrackedSession;

    await expect(runGuardedSessionResume(
      inFlight,
      'session-1',
      () => undefined,
      async () => ({ type: 'error' as const }),
    )).resolves.toEqual({ type: 'error' });

    expect(inFlight.has('session-1')).toBe(false);
    expect(findActiveTrackedSession([active], 'session-1')).toBe(active);
  });

  it('allows a later retry after a failed resume', async () => {
    const inFlight = new Map<string, Promise<string>>();
    const failure = new Error('failed');

    await expect(runGuardedSessionResume(inFlight, 'session-1', () => undefined, async () => {
      throw failure;
    })).rejects.toBe(failure);

    await expect(runGuardedSessionResume(inFlight, 'session-1', () => undefined, async () => 'retried')).resolves.toBe('retried');
  });

  it('joins pending startup even after the child becomes visible', async () => {
    const inFlight = new Map<string, Promise<{ type: 'success' | 'error' }>>();
    let childIsVisible = false;
    let release!: (value: { type: 'error' }) => void;
    const resume = vi.fn(() => new Promise<{ type: 'success' | 'error' }>((resolve) => {
      childIsVisible = true;
      release = resolve;
    }));
    const getAlreadyActiveResult = () => (
      childIsVisible ? { type: 'success' as const } : undefined
    );

    const first = runGuardedSessionResume(inFlight, 'session-1', getAlreadyActiveResult, resume);
    await Promise.resolve();
    const second = runGuardedSessionResume(inFlight, 'session-1', getAlreadyActiveResult, resume);
    release({ type: 'error' });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { type: 'error' },
      { type: 'error' },
    ]);
    expect(resume).toHaveBeenCalledTimes(1);
  });
});
