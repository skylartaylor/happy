import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error react-test-renderer does not bundle TypeScript declarations.
import { act, create } from 'react-test-renderer';

vi.mock('@expo/vector-icons', () => ({
    Ionicons: (props: Record<string, unknown>) => React.createElement('Icon', props),
}));

vi.mock('react-native', () => ({
    AccessibilityInfo: { announceForAccessibility: vi.fn() },
    Platform: { OS: 'android' },
    Pressable: ({ children, ...props }: Record<string, any>) => React.createElement('Pressable', props, children),
    View: ({ children, ...props }: Record<string, any>) => React.createElement('View', props, children),
}));

vi.mock('react-native-unistyles', () => {
    const theme = {
        colors: {
            surfacePressed: '#303030',
            success: '#30d158',
            textSecondary: '#a0a0a0',
        },
    };
    return {
        StyleSheet: {
            create: (factory: (value: typeof theme) => unknown) => factory(theme),
        },
        useUnistyles: () => ({ theme }),
    };
});

vi.mock('@/modal', () => ({
    Modal: { alert: vi.fn() },
}));

vi.mock('@/text', () => ({
    t: (key: string) => ({
        'message.copyResponse': 'Copy response',
        'message.responseCopied': 'Response copied',
    }[key] ?? key),
}));

vi.mock('@/utils/copyTextToClipboard', () => ({
    copyTextToClipboard: vi.fn(),
    isCopyableText: vi.fn(() => true),
}));

import { AccessibilityInfo } from 'react-native';
import { Modal } from '@/modal';
import { copyTextToClipboard } from '@/utils/copyTextToClipboard';
import { AgentResponseCopyButton, AgentResponseCopyButtonView } from './AgentResponseCopyButton';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type ElementWithProps = React.ReactElement<Record<string, any>>;

function childrenOf(node: React.ReactNode): React.ReactNode[] {
    if (!React.isValidElement(node)) {
        return [];
    }
    return React.Children.toArray((node as ElementWithProps).props.children);
}

function findByProp(node: React.ReactNode, prop: string, value: unknown): ElementWithProps {
    if (React.isValidElement(node)) {
        const element = node as ElementWithProps;
        if (element.props[prop] === value) {
            return element;
        }
        for (const child of childrenOf(element)) {
            const match = findByPropOrNull(child, prop, value);
            if (match) {
                return match;
            }
        }
    }
    throw new Error(`Unable to find element with ${prop}=${String(value)}`);
}

function findByPropOrNull(node: React.ReactNode, prop: string, value: unknown): ElementWithProps | null {
    try {
        return findByProp(node, prop, value);
    } catch {
        return null;
    }
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((promiseResolve) => {
        resolve = promiseResolve;
    });
    return { promise, resolve };
}

describe('AgentResponseCopyButton', () => {
    const copyTextMock = vi.mocked(copyTextToClipboard);
    const alertMock = vi.mocked(Modal.alert);
    const announceMock = vi.mocked(AccessibilityInfo.announceForAccessibility);

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows success for the current response and resets it after two seconds', async () => {
        copyTextMock.mockResolvedValueOnce({ ok: true });
        let renderer: any;
        await act(async () => {
            renderer = create(React.createElement(AgentResponseCopyButton, {
                messageId: 'message-1',
                text: '  **exact markdown**\n',
            }));
        });

        await act(async () => {
            await renderer.root.findByType('Pressable').props.onPress();
        });

        expect(copyTextMock).toHaveBeenCalledWith('  **exact markdown**\n');
        expect(renderer.root.findByType('Pressable').props.accessibilityLabel).toBe('Response copied');
        expect(announceMock).toHaveBeenCalledWith('Response copied');

        await act(async () => {
            vi.advanceTimersByTime(2000);
        });
        expect(renderer.root.findByType('Pressable').props.accessibilityLabel).toBe('Copy response');

        await act(async () => {
            renderer.unmount();
        });
    });

    it('ignores a late success after the response snapshot changes', async () => {
        const pendingCopy = deferred<{ ok: true }>();
        copyTextMock.mockReturnValueOnce(pendingCopy.promise);
        let renderer: any;
        await act(async () => {
            renderer = create(React.createElement(AgentResponseCopyButton, {
                messageId: 'message-1',
                text: 'partial response',
            }));
        });

        let copyPromise!: Promise<void>;
        await act(async () => {
            copyPromise = renderer.root.findByType('Pressable').props.onPress();
        });
        await act(async () => {
            renderer.update(React.createElement(AgentResponseCopyButton, {
                messageId: 'message-1',
                text: 'completed response',
            }));
        });
        await act(async () => {
            pendingCopy.resolve({ ok: true });
            await copyPromise;
        });

        expect(renderer.root.findByType('Pressable').props.accessibilityLabel).toBe('Copy response');
        expect(announceMock).not.toHaveBeenCalled();

        await act(async () => {
            renderer.unmount();
        });
    });

    it('shows failures only for the current response snapshot', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        copyTextMock.mockResolvedValueOnce({ ok: false, error: new Error('current failure') });
        let renderer: any;
        await act(async () => {
            renderer = create(React.createElement(AgentResponseCopyButton, {
                messageId: 'message-1',
                text: 'first response',
            }));
        });

        await act(async () => {
            await renderer.root.findByType('Pressable').props.onPress();
        });
        expect(alertMock).toHaveBeenCalledOnce();

        const pendingCopy = deferred<{ ok: false; error: Error }>();
        copyTextMock.mockReturnValueOnce(pendingCopy.promise);
        let copyPromise!: Promise<void>;
        await act(async () => {
            copyPromise = renderer.root.findByType('Pressable').props.onPress();
        });
        await act(async () => {
            renderer.update(React.createElement(AgentResponseCopyButton, {
                messageId: 'message-2',
                text: 'second response',
            }));
        });
        await act(async () => {
            pendingCopy.resolve({ ok: false, error: new Error('stale failure') });
            await copyPromise;
        });

        expect(alertMock).toHaveBeenCalledOnce();

        await act(async () => {
            renderer.unmount();
        });
        consoleError.mockRestore();
    });

    it('ignores a copy result that resolves after unmount', async () => {
        const pendingCopy = deferred<{ ok: true }>();
        copyTextMock.mockReturnValueOnce(pendingCopy.promise);
        let renderer: any;
        await act(async () => {
            renderer = create(React.createElement(AgentResponseCopyButton, {
                messageId: 'message-1',
                text: 'response',
            }));
        });

        let copyPromise!: Promise<void>;
        await act(async () => {
            copyPromise = renderer.root.findByType('Pressable').props.onPress();
        });
        await act(async () => {
            renderer.unmount();
        });
        await act(async () => {
            pendingCopy.resolve({ ok: true });
            await copyPromise;
        });

        expect(announceMock).not.toHaveBeenCalled();
        expect(alertMock).not.toHaveBeenCalled();
    });
});

describe('AgentResponseCopyButtonView', () => {
    it('renders an accessible copy action with the repository touch-target pattern', () => {
        const onPress = vi.fn();
        const element = AgentResponseCopyButtonView({ copied: false, onPress });
        const button = findByProp(element, 'accessibilityLabel', 'Copy response');
        const icon = findByProp(element, 'name', 'copy-outline');

        expect(button.props.accessibilityRole).toBe('button');
        expect(button.props.accessibilityLabel).toBe('Copy response');
        expect(button.props.hitSlop).toBe(8);
        expect(icon.props.name).toBe('copy-outline');

        button.props.onPress();
        expect(onPress).toHaveBeenCalledOnce();
    });

    it('exposes the copied state to sighted and screen-reader users', () => {
        const element = AgentResponseCopyButtonView({ copied: true, onPress: vi.fn() });
        const button = findByProp(element, 'accessibilityLabel', 'Response copied');
        const icon = findByProp(element, 'name', 'checkmark-outline');

        expect(button.props.accessibilityLabel).toBe('Response copied');
        expect(icon.props.name).toBe('checkmark-outline');
        expect(icon.props.color).toBe('#30d158');
    });
});
