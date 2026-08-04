import { MMKV } from 'react-native-mmkv';

const OUTBOX_KEY = 'pending-message-outbox-v1';
const mmkv = new MMKV();

export type PersistedOutboxMessage = {
    localId: string;
    content: string;
};

type PersistedOutbox = {
    owner: string;
    sessions: Record<string, PersistedOutboxMessage[]>;
};

function isOutboxMessage(value: unknown): value is PersistedOutboxMessage {
    return typeof value === 'object'
        && value !== null
        && typeof (value as PersistedOutboxMessage).localId === 'string'
        && typeof (value as PersistedOutboxMessage).content === 'string';
}

export function loadPendingMessageOutbox(owner: string): Map<string, PersistedOutboxMessage[]> {
    const raw = mmkv.getString(OUTBOX_KEY);
    if (!raw) {
        return new Map();
    }

    try {
        const parsed = JSON.parse(raw) as Partial<PersistedOutbox>;
        if (parsed.owner !== owner || typeof parsed.sessions !== 'object' || parsed.sessions === null) {
            return new Map();
        }

        const outbox = new Map<string, PersistedOutboxMessage[]>();
        for (const [sessionId, messages] of Object.entries(parsed.sessions)) {
            if (!Array.isArray(messages)) {
                continue;
            }
            const validMessages = messages.filter(isOutboxMessage);
            if (validMessages.length > 0) {
                outbox.set(sessionId, validMessages);
            }
        }
        return outbox;
    } catch (error) {
        console.error('Failed to parse pending message outbox', error);
        return new Map();
    }
}

export function savePendingMessageOutbox(
    owner: string,
    outbox: ReadonlyMap<string, readonly PersistedOutboxMessage[]>,
): void {
    const sessions: Record<string, PersistedOutboxMessage[]> = {};
    for (const [sessionId, messages] of outbox) {
        if (messages.length > 0) {
            sessions[sessionId] = messages.map((message) => ({ ...message }));
        }
    }

    if (Object.keys(sessions).length === 0) {
        mmkv.delete(OUTBOX_KEY);
        return;
    }

    mmkv.set(OUTBOX_KEY, JSON.stringify({ owner, sessions } satisfies PersistedOutbox));
}
