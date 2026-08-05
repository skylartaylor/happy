import type { ApprovalPolicy, SandboxMode } from './codexAppServerTypes';
import type { PermissionMode } from '@/api/types';

export function resolveCodexPermissionModeAfterAbort(
    currentPermissionMode: PermissionMode | undefined,
    initialPermissionMode: PermissionMode,
): PermissionMode {
    // Abort cleanup must not discard a mode explicitly selected after launch.
    // The caller separately marks the mode as non-explicit so stale approvals
    // from the aborted turn cannot use it for auto-approval.
    return currentPermissionMode ?? initialPermissionMode;
}

export function resolveCodexApprovalDecision(
    abortInProgress: boolean,
    activePermissionMode: PermissionMode,
    latestPermissionMode: PermissionMode | undefined,
    sandboxManagedByHappy: boolean,
): 'abort' | 'approved' | null {
    if (abortInProgress) {
        return 'abort';
    }

    if (shouldAutoApproveCodexApproval(activePermissionMode, sandboxManagedByHappy)
        || (latestPermissionMode !== undefined
            && shouldAutoApproveCodexApproval(latestPermissionMode, sandboxManagedByHappy))) {
        return 'approved';
    }

    return null;
}

export function resolveCodexExecutionPolicy(
    permissionMode: PermissionMode,
    sandboxManagedByHappy: boolean,
): { approvalPolicy: ApprovalPolicy; sandbox: SandboxMode } {
    if (sandboxManagedByHappy) {
        return {
            approvalPolicy: 'never',
            sandbox: 'danger-full-access',
        };
    }

    const approvalPolicy: ApprovalPolicy = (() => {
        switch (permissionMode) {
            // Codex native modes
            case 'default': return 'untrusted';                    // Ask for non-trusted commands
            case 'read-only': return 'never';                      // Never ask, read-only enforced by sandbox
            case 'safe-yolo': return 'never';                      // Workspace sandbox enforces safety; do not prompt
            case 'yolo': return 'never';                           // Full YOLO: never interrupt for approvals
            // Defensive fallback for Claude-specific modes (backward compatibility)
            case 'bypassPermissions': return 'never';              // Full access: map to yolo behavior
            case 'acceptEdits': return 'on-request';               // Let model decide (closest to auto-approve edits)
            case 'plan': return 'untrusted';                       // Conservative: ask for non-trusted
            default: return 'untrusted';                           // Safe fallback
        }
    })();

    const sandbox: SandboxMode = (() => {
        switch (permissionMode) {
            // Codex native modes
            case 'default': return 'workspace-write';              // Can write in workspace
            case 'read-only': return 'read-only';                  // Read-only filesystem
            case 'safe-yolo': return 'workspace-write';            // Can write in workspace
            case 'yolo': return 'danger-full-access';              // Full system access
            // Defensive fallback for Claude-specific modes
            case 'bypassPermissions': return 'danger-full-access'; // Full access: map to yolo
            case 'acceptEdits': return 'workspace-write';          // Can edit files in workspace
            case 'plan': return 'workspace-write';                 // Can write for planning
            default: return 'workspace-write';                     // Safe default
        }
    })();

    return { approvalPolicy, sandbox };
}

export function shouldAutoApproveCodexApproval(
    permissionMode: PermissionMode,
    sandboxManagedByHappy: boolean,
): boolean {
    if (sandboxManagedByHappy) {
        return true;
    }

    // safe-yolo is deliberately absent: its turns run with approvalPolicy
    // 'never' inside the workspace sandbox, so any approval codex still
    // surfaces (a sandbox-escalation retry or an MCP elicitation) is exactly
    // what safe-yolo promises to ask the user about.
    return permissionMode === 'yolo' || permissionMode === 'bypassPermissions';
}
