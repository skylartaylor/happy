import { describe, expect, it } from 'vitest';
import { getAgentPickerItems, getLatestMachineModelMetadata, getModePickerItems } from './newSessionPickerItems';
import type { Session } from '@/sync/storageTypes';

describe('new session picker items', () => {
    it('maps agents to picker item labels', () => {
        expect(getAgentPickerItems([
            { key: 'claude', label: 'claude code' },
            { key: 'codex', label: 'codex' },
        ])).toEqual([
            { key: 'claude', label: 'claude code' },
            { key: 'codex', label: 'codex' },
        ]);
    });

    it('maps model, effort, and permission options with descriptions', () => {
        expect(getModePickerItems([
            { key: 'default', name: 'default model', description: null },
            { key: 'opus', name: 'opus 4.7', description: 'larger context' },
        ])).toEqual([
            { key: 'default', label: 'default model' },
            { key: 'opus', label: 'opus 4.7', subtitle: 'larger context' },
        ]);
    });

    it('uses the newest model catalog for the selected machine and agent', () => {
        const session = (updatedAt: number, machineId: string, flavor: string, code: string): Session => ({
            id: `${machineId}-${flavor}-${updatedAt}`,
            seq: 0,
            createdAt: updatedAt,
            updatedAt,
            active: false,
            activeAt: updatedAt,
            metadataVersion: 1,
            metadata: {
                machineId,
                flavor,
                path: '/workspace',
                host: machineId,
                models: [{ code, value: code }],
            },
            agentState: null,
            agentStateVersion: 1,
            thinking: false,
            thinkingAt: updatedAt,
            presence: updatedAt,
        });
        const sessions = [
            session(1, 'openrouter', 'codex', 'old/model'),
            session(3, 'subscription', 'codex', 'openai/model'),
            session(2, 'openrouter', 'claude', 'anthropic/model'),
            session(4, 'openrouter', 'codex', 'new/model'),
        ];

        expect(getLatestMachineModelMetadata(sessions, 'openrouter', 'codex')?.models).toEqual([
            { code: 'new/model', value: 'new/model' },
        ]);
        expect(getLatestMachineModelMetadata(sessions, 'subscription', 'codex')?.models).toEqual([
            { code: 'openai/model', value: 'openai/model' },
        ]);
    });
});
