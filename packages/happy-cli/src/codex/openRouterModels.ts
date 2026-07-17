export type OpenRouterModelOption = {
    code: string;
    value: string;
    description: string;
};

type OpenRouterModelsResponse = {
    data?: unknown;
};

export async function listOpenRouterModels(
    apiKey: string,
    request: typeof fetch = fetch,
): Promise<OpenRouterModelOption[]> {
    const response = await request('https://openrouter.ai/api/v1/models?supported_parameters=tools', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
        throw new Error(`OpenRouter model catalog returned HTTP ${response.status}.`);
    }

    const payload = await response.json() as OpenRouterModelsResponse;
    if (!Array.isArray(payload.data)) {
        throw new Error('OpenRouter model catalog returned an invalid response.');
    }

    const models = new Map<string, OpenRouterModelOption>();
    for (const item of payload.data) {
        if (!item || typeof item !== 'object') continue;
        const { id, name } = item as { id?: unknown; name?: unknown };
        if (typeof id !== 'string' || id.length === 0 || models.has(id)) continue;
        models.set(id, {
            code: id,
            value: typeof name === 'string' && name.length > 0 ? name : id,
            description: id,
        });
    }
    return [...models.values()];
}
