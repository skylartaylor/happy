import { describe, expect, it } from 'vitest';
import {
    resolveCodexApprovalDecision,
    resolveCodexExecutionPolicy,
    resolveCodexPermissionModeAfterAbort,
    shouldAutoApproveCodexApproval,
} from '../executionPolicy';

describe('resolveCodexExecutionPolicy', () => {
    it('forces never + danger-full-access when sandbox is managed by Happy', () => {
        const policy = resolveCodexExecutionPolicy('default', true);

        expect(policy).toEqual({
            approvalPolicy: 'never',
            sandbox: 'danger-full-access',
        });
    });

    it('maps codex default mode to untrusted + workspace-write without managed sandbox', () => {
        const policy = resolveCodexExecutionPolicy('default', false);

        expect(policy).toEqual({
            approvalPolicy: 'untrusted',
            sandbox: 'workspace-write',
        });
    });

    it('maps read-only mode to never + read-only without managed sandbox', () => {
        const policy = resolveCodexExecutionPolicy('read-only', false);

        expect(policy).toEqual({
            approvalPolicy: 'never',
            sandbox: 'read-only',
        });
    });

    it('maps safe-yolo mode to never + workspace-write without managed sandbox', () => {
        const policy = resolveCodexExecutionPolicy('safe-yolo', false);

        expect(policy).toEqual({
            approvalPolicy: 'never',
            sandbox: 'workspace-write',
        });
    });

    it('maps yolo mode to never + danger-full-access without managed sandbox', () => {
        const policy = resolveCodexExecutionPolicy('yolo', false);

        expect(policy).toEqual({
            approvalPolicy: 'never',
            sandbox: 'danger-full-access',
        });
    });

    it('maps bypassPermissions mode to never + danger-full-access without managed sandbox', () => {
        const policy = resolveCodexExecutionPolicy('bypassPermissions', false);

        expect(policy).toEqual({
            approvalPolicy: 'never',
            sandbox: 'danger-full-access',
        });
    });

    it('auto-approves bridge prompts for no-prompt modes without managed sandbox', () => {
        expect(shouldAutoApproveCodexApproval('default', false)).toBe(false);
        expect(shouldAutoApproveCodexApproval('read-only', false)).toBe(false);
        // safe-yolo must keep prompting: its turns run with approvalPolicy
        // 'never' inside the workspace sandbox, so any approval codex still
        // surfaces is a sandbox escalation — the one thing safe-yolo
        // promises to ask the user about.
        expect(shouldAutoApproveCodexApproval('safe-yolo', false)).toBe(false);
        expect(shouldAutoApproveCodexApproval('yolo', false)).toBe(true);
        expect(shouldAutoApproveCodexApproval('bypassPermissions', false)).toBe(true);
    });

    it('auto-approves bridge prompts when Happy owns sandboxing', () => {
        expect(shouldAutoApproveCodexApproval('default', true)).toBe(true);
        expect(shouldAutoApproveCodexApproval('read-only', true)).toBe(true);
        expect(shouldAutoApproveCodexApproval('safe-yolo', true)).toBe(true);
    });
});

describe('resolveCodexPermissionModeAfterAbort', () => {
    it('preserves a mode selected after a read-only launch', () => {
        expect(resolveCodexPermissionModeAfterAbort('yolo', 'read-only')).toBe('yolo');
        expect(resolveCodexPermissionModeAfterAbort('safe-yolo', 'read-only')).toBe('safe-yolo');
    });

    it('falls back to the launch mode before any mode has been selected', () => {
        expect(resolveCodexPermissionModeAfterAbort(undefined, 'read-only')).toBe('read-only');
    });
});

describe('resolveCodexApprovalDecision', () => {
    it('aborts a late approval after switching a read-only turn to yolo', () => {
        expect(resolveCodexApprovalDecision(true, 'read-only', 'yolo', false)).toBe('abort');
    });

    it('aborts a late approval from an active yolo turn', () => {
        expect(resolveCodexApprovalDecision(true, 'yolo', undefined, false)).toBe('abort');
    });

    it('uses the latest explicit yolo mode outside abort cleanup', () => {
        expect(resolveCodexApprovalDecision(false, 'read-only', 'yolo', false)).toBe('approved');
    });

    it('returns no immediate decision for an ordinary untrusted approval', () => {
        expect(resolveCodexApprovalDecision(false, 'default', undefined, false)).toBeNull();
    });
});
