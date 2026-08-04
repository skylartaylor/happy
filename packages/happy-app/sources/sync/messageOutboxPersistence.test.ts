import { beforeEach, describe, expect, it, vi } from 'vitest';

const storedValues = vi.hoisted(() => new Map<string, string>());

vi.mock('react-native-mmkv', () => ({
    MMKV: class {
        getString(key: string) {
            return storedValues.get(key);
        }

        set(key: string, value: string) {
            storedValues.set(key, value);
        }

        delete(key: string) {
            storedValues.delete(key);
        }
    },
}));

import { loadPendingMessageOutbox, savePendingMessageOutbox } from './messageOutboxPersistence';

describe('message outbox persistence', () => {
    beforeEach(() => {
        storedValues.clear();
    });

    it('restores encrypted messages for the same account', () => {
        savePendingMessageOutbox('server:user-1', new Map([
            ['session-1', [
                { localId: 'local-1', content: 'encrypted-1' },
                { localId: 'local-2', content: 'encrypted-2' },
            ]],
        ]));

        expect(loadPendingMessageOutbox('server:user-1')).toEqual(new Map([
            ['session-1', [
                { localId: 'local-1', content: 'encrypted-1' },
                { localId: 'local-2', content: 'encrypted-2' },
            ]],
        ]));
    });

    it('does not expose another account\'s pending messages', () => {
        savePendingMessageOutbox('server:user-1', new Map([
            ['session-1', [{ localId: 'local-1', content: 'encrypted-1' }]],
        ]));

        expect(loadPendingMessageOutbox('server:user-2')).toEqual(new Map());
    });

    it('removes persisted state after the outbox drains', () => {
        savePendingMessageOutbox('server:user-1', new Map([
            ['session-1', [{ localId: 'local-1', content: 'encrypted-1' }]],
        ]));

        savePendingMessageOutbox('server:user-1', new Map());

        expect(loadPendingMessageOutbox('server:user-1')).toEqual(new Map());
    });
});
