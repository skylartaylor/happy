import type { TrackedSession } from './types';

export function findActiveTrackedSession(
  sessions: Iterable<TrackedSession>,
  happySessionId: string,
): TrackedSession | undefined {
  for (const session of sessions) {
    if (session.happySessionId === happySessionId) return session;
  }
  return undefined;
}

export async function runGuardedSessionResume<T>(
  inFlightResumes: Map<string, Promise<T>>,
  happySessionId: string,
  getAlreadyActiveResult: () => T | undefined,
  resume: () => Promise<T>,
): Promise<T> {
  const existing = inFlightResumes.get(happySessionId);
  if (existing) return existing;

  const alreadyActiveResult = getAlreadyActiveResult();
  if (alreadyActiveResult !== undefined) {
    return alreadyActiveResult;
  }

  const pending = Promise.resolve().then(resume);
  inFlightResumes.set(happySessionId, pending);

  try {
    return await pending;
  } finally {
    if (inFlightResumes.get(happySessionId) === pending) {
      inFlightResumes.delete(happySessionId);
    }
  }
}
