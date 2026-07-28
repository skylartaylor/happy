import { describe, expect, it } from 'vitest';

import {
    decodeCodexModelSelection,
    encodeCodexModelSelection,
    needsCodexProviderSwitch,
} from './codexModelSelection';

describe('Codex model selections', () => {
    it('round-trips provider-qualified models', () => {
        const encoded = encodeCodexModelSelection('openrouter', 'anthropic/claude-sonnet-4.6');

        expect(encoded).toBe('openrouter::anthropic/claude-sonnet-4.6');
        expect(decodeCodexModelSelection(encoded)).toEqual({
            modelProvider: 'openrouter',
            model: 'anthropic/claude-sonnet-4.6',
        });
    });

    it('keeps legacy model values provider-neutral', () => {
        expect(decodeCodexModelSelection('gpt-5.4')).toEqual({ model: 'gpt-5.4' });
        expect(decodeCodexModelSelection('unknown::model')).toEqual({ model: 'unknown::model' });
        expect(decodeCodexModelSelection('default')).toEqual({});
    });

    it('switches only for an explicit different provider', () => {
        expect(needsCodexProviderSwitch('openai', decodeCodexModelSelection('openrouter::z-ai/glm-5.2'))).toBe(true);
        expect(needsCodexProviderSwitch('openrouter', decodeCodexModelSelection('openrouter::z-ai/glm-5.2'))).toBe(false);
        expect(needsCodexProviderSwitch('openai', decodeCodexModelSelection('gpt-5.4'))).toBe(false);
    });
});
