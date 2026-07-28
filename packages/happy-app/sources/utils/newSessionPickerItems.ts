type AgentPickerSource = {
    key: string;
    label: string;
};

type ModePickerSource = {
    key: string;
    name: string;
    description?: string | null;
};

export type NewSessionPickerItem = {
    key: string;
    label: string;
    subtitle?: string;
};

export function getAgentPickerItems(agents: AgentPickerSource[]): NewSessionPickerItem[] {
    return agents.map((agent) => ({
        key: agent.key,
        label: agent.label,
    }));
}

export function getModePickerItems(options: ModePickerSource[]): NewSessionPickerItem[] {
    return options.map((option) => ({
        key: option.key,
        label: option.name,
        ...(option.description ? { subtitle: option.description } : {}),
    }));
}

export function getLatestMachineModelMetadata(
    sessions: Array<Session | string> | null,
    machineId: string | null,
    flavor: string,
): Metadata | null {
    if (!sessions || !machineId) return null;

    let latest: Session | null = null;
    let latestCatalogVersion = -1;
    for (const candidate of sessions) {
        if (typeof candidate === 'string') continue;
        const metadata = candidate.metadata;
        if (
            metadata?.machineId !== machineId
            || metadata.flavor !== flavor
            || !metadata.models?.length
        ) {
            continue;
        }
        const catalogVersion = metadata.modelCatalogVersion
            ?? (metadata.models.some((model) => /^(openai|openrouter)::/.test(model.code)) ? 1 : 0);
        if (
            !latest
            || catalogVersion > latestCatalogVersion
            || (catalogVersion === latestCatalogVersion && candidate.updatedAt > latest.updatedAt)
        ) {
            latest = candidate;
            latestCatalogVersion = catalogVersion;
        }
    }
    return latest?.metadata ?? null;
}
import type { Metadata, Session } from '@/sync/storageTypes';
