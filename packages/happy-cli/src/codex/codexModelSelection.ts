export const CODEX_MODEL_PROVIDERS = ['openai', 'openrouter'] as const;

export type CodexModelProvider = typeof CODEX_MODEL_PROVIDERS[number];

export type CodexModelSelection = {
    model?: string;
    modelProvider?: CodexModelProvider;
};

export function encodeCodexModelSelection(provider: CodexModelProvider, model: string): string {
    return `${provider}::${model}`;
}

export function decodeCodexModelSelection(value?: string): CodexModelSelection {
    if (!value || value === 'default') {
        return {};
    }

    for (const provider of CODEX_MODEL_PROVIDERS) {
        const prefix = `${provider}::`;
        if (value.startsWith(prefix) && value.length > prefix.length) {
            return { modelProvider: provider, model: value.slice(prefix.length) };
        }
    }

    return { model: value };
}

export function needsCodexProviderSwitch(
    activeProvider: string | undefined,
    selection: CodexModelSelection,
): boolean {
    return selection.modelProvider !== undefined && selection.modelProvider !== activeProvider;
}
