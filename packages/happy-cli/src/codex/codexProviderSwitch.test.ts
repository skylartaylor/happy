import { describe, expect, it } from 'vitest';

import { buildPortableCodexHistoryItems } from './codexProviderSwitch';

describe('buildPortableCodexHistoryItems', () => {
    it('transfers user and assistant text without provider-bound tool state', () => {
        const items = buildPortableCodexHistoryItems({
            turns: [{
                id: 'turn-1',
                items: [
                    { type: 'userMessage', id: 'user-1', content: [{ type: 'text', text: 'Test' }] },
                    { type: 'commandExecution', id: 'tool-1', command: 'pwd', aggregatedOutput: '/tmp' },
                    { type: 'agentMessage', id: 'agent-1', text: 'Worked' },
                ],
            }],
        });

        expect(items).toHaveLength(1);
        const text = (items[0] as { content: Array<{ text: string }> }).content[0].text;
        expect(text).toContain('{"role":"user","text":"Test"}');
        expect(text).toContain('{"role":"assistant","text":"Worked"}');
        expect(text).not.toContain('pwd');
        expect(text).not.toContain('/tmp');
    });

    it('does not inject an empty transcript', () => {
        expect(buildPortableCodexHistoryItems({ turns: [] })).toEqual([]);
    });
});
