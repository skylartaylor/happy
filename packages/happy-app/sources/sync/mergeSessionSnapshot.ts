import type { Session } from './storageTypes';

type VersionedSessionPayload = Pick<
    Session,
    'metadata' | 'metadataVersion' | 'agentState' | 'agentStateVersion'
>;

export function preserveNewerSessionPayload(
    existing: VersionedSessionPayload | undefined,
    incoming: VersionedSessionPayload,
): VersionedSessionPayload {
    if (!existing) return incoming;

    return {
        metadata: incoming.metadataVersion >= existing.metadataVersion
            ? incoming.metadata
            : existing.metadata,
        metadataVersion: Math.max(incoming.metadataVersion, existing.metadataVersion),
        agentState: incoming.agentStateVersion >= existing.agentStateVersion
            ? incoming.agentState
            : existing.agentState,
        agentStateVersion: Math.max(incoming.agentStateVersion, existing.agentStateVersion),
    };
}
