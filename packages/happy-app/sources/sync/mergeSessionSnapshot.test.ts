import { describe, expect, it } from 'vitest';

import { preserveNewerSessionPayload } from './mergeSessionSnapshot';

describe('preserveNewerSessionPayload', () => {
    it('does not let delayed session snapshots replace newer encrypted payloads', () => {
        const existing = {
            metadata: { path: '/new', host: 'host' },
            metadataVersion: 4,
            agentState: { controlledByUser: true },
            agentStateVersion: 7,
        } as const;
        const incoming = {
            metadata: { path: '/old', host: 'host' },
            metadataVersion: 3,
            agentState: { controlledByUser: false },
            agentStateVersion: 6,
        } as const;

        expect(preserveNewerSessionPayload(existing, incoming)).toEqual(existing);
    });
});
