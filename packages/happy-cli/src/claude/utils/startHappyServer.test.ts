import { afterEach, describe, expect, it } from 'vitest';

import type { ApiSessionClient } from '@/api/apiSession';

import { startHappyServer } from './startHappyServer';

describe('startHappyServer wake hook', () => {
    let stop: (() => void) | undefined;

    afterEach(() => {
        stop?.();
        stop = undefined;
    });

    it('delivers an authenticated local wake message to the session', async () => {
        const received: string[] = [];
        const fakeSessionClient = {
            sessionId: 'wake-test',
            injectLocalUserMessage: (text: string) => received.push(text),
            sendClaudeSessionMessage: () => {},
        } as unknown as ApiSessionClient;
        const server = await startHappyServer(fakeSessionClient);
        stop = server.stop;

        const response = await fetch(server.wakeUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text: '[PR watcher] checks changed' }),
        });

        expect(response.status).toBe(202);
        expect(received).toEqual(['[PR watcher] checks changed']);
    });

    it('rejects malformed wake messages', async () => {
        const fakeSessionClient = {
            sessionId: 'wake-test',
            injectLocalUserMessage: () => {},
            sendClaudeSessionMessage: () => {},
        } as unknown as ApiSessionClient;
        const server = await startHappyServer(fakeSessionClient);
        stop = server.stop;

        const response = await fetch(server.wakeUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text: '' }),
        });

        expect(response.status).toBe(400);
    });
});
