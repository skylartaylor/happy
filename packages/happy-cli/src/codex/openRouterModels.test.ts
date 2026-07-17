import { describe, expect, it, vi } from 'vitest';
import { listOpenRouterModels } from './openRouterModels';

describe('listOpenRouterModels', () => {
    it('maps and deduplicates tool-capable OpenRouter models', async () => {
        const request = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                data: [
                    { id: 'z-ai/glm-5.2', name: 'Z.AI: GLM 5.2' },
                    { id: 'anthropic/claude-sonnet-4.6', name: 'Anthropic: Claude Sonnet 4.6' },
                    { id: 'z-ai/glm-5.2', name: 'duplicate' },
                    { name: 'missing id' },
                ],
            }),
        });

        await expect(listOpenRouterModels('secret', request)).resolves.toEqual([
            { code: 'z-ai/glm-5.2', value: 'Z.AI: GLM 5.2', description: 'z-ai/glm-5.2' },
            {
                code: 'anthropic/claude-sonnet-4.6',
                value: 'Anthropic: Claude Sonnet 4.6',
                description: 'anthropic/claude-sonnet-4.6',
            },
        ]);
        expect(request).toHaveBeenCalledWith(
            'https://openrouter.ai/api/v1/models?supported_parameters=tools',
            expect.objectContaining({
                headers: { Authorization: 'Bearer secret' },
                signal: expect.any(AbortSignal),
            }),
        );
    });

    it('rejects malformed responses', async () => {
        const request = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ data: null }),
        });

        await expect(listOpenRouterModels('secret', request)).rejects.toThrow('invalid response');
    });
});
