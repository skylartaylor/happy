import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    setStringAsync: vi.fn(),
}));

vi.mock('expo-clipboard', () => ({
    setStringAsync: mocks.setStringAsync,
}));

import { copyTextToClipboard, isCopyableText } from './copyTextToClipboard';

describe('copyTextToClipboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('copies Markdown exactly without trimming or rendering it', async () => {
        const markdown = '  ## Result\n\n```ts\nconst value = 1;\n```\n';
        mocks.setStringAsync.mockResolvedValue(undefined);

        const result = await copyTextToClipboard(markdown);

        expect(result).toEqual({ ok: true });
        expect(mocks.setStringAsync).toHaveBeenCalledOnce();
        expect(mocks.setStringAsync).toHaveBeenCalledWith(markdown);
    });

    it('returns the clipboard error without throwing', async () => {
        const error = new Error('clipboard unavailable');
        mocks.setStringAsync.mockRejectedValue(error);

        await expect(copyTextToClipboard('response')).resolves.toEqual({
            ok: false,
            error,
        });
    });
});

describe('isCopyableText', () => {
    it('rejects empty and whitespace-only text', () => {
        expect(isCopyableText('')).toBe(false);
        expect(isCopyableText(' \n\t')).toBe(false);
    });

    it('accepts content without changing the value that will be copied', () => {
        expect(isCopyableText('  # heading\n')).toBe(true);
    });
});
