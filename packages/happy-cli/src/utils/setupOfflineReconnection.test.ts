import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/api/api';
import type { ApiSessionClient } from '@/api/apiSession';
import type { Session } from '@/api/types';
import { setupOfflineReconnection } from './setupOfflineReconnection';

const mocks = vi.hoisted(() => ({
    notifyDaemonSessionStarted: vi.fn(),
    startOfflineReconnection: vi.fn(),
}));

vi.mock('@/daemon/controlClient', () => ({
    notifyDaemonSessionStarted: mocks.notifyDaemonSessionStarted,
}));

vi.mock('@/utils/serverConnectionErrors', () => ({
    startOfflineReconnection: mocks.startOfflineReconnection,
}));

vi.mock('@/api/encryption', () => ({
    encodeBase64: vi.fn(() => 'encoded-key'),
}));

vi.mock('@/configuration', () => ({
    configuration: { serverUrl: 'https://api.example.com' },
}));

vi.mock('@/ui/logger', () => ({
    logger: { debug: vi.fn() },
}));

describe('setupOfflineReconnection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.notifyDaemonSessionStarted.mockResolvedValue({ status: 'ok' });
    });

    it('reports a recovered offline session to the daemon', async () => {
        let reconnect!: () => Promise<ApiSessionClient>;
        const reconnectionHandle = {
            cancel: vi.fn(),
            getSession: vi.fn(() => null),
            isReconnected: vi.fn(() => false),
        };
        mocks.startOfflineReconnection.mockImplementation((config) => {
            reconnect = config.onReconnected;
            return reconnectionHandle;
        });

        const metadata = { path: '/workspace', host: 'test-host' } as any;
        const state = {} as any;
        const recoveredSession = {
            id: 'happy-session',
            seq: 7,
            metadata,
            metadataVersion: 8,
            agentState: state,
            agentStateVersion: 9,
            encryptionKey: new Uint8Array([1, 2, 3]),
            encryptionVariant: 'dataKey',
        } satisfies Session;
        const realSession = { id: 'session-client' } as unknown as ApiSessionClient;
        const api = {
            getOrCreateSession: vi.fn().mockResolvedValue(recoveredSession),
            sessionSyncClient: vi.fn(() => realSession),
        } as unknown as ApiClient;
        const onSessionSwap = vi.fn();

        const result = setupOfflineReconnection({
            api,
            sessionTag: 'spawn-tag',
            metadata,
            state,
            response: null,
            onSessionSwap,
        });

        expect(result.isOffline).toBe(true);
        expect(result.reconnectionHandle).toBe(reconnectionHandle);
        await expect(reconnect()).resolves.toBe(realSession);
        expect(onSessionSwap).toHaveBeenCalledWith(realSession);
        expect(mocks.notifyDaemonSessionStarted).toHaveBeenCalledWith(
            'happy-session',
            metadata,
            {
                encryptionKey: 'encoded-key',
                encryptionVariant: 'dataKey',
                seq: 7,
                metadataVersion: 8,
                agentStateVersion: 9,
            },
        );
    });
});
