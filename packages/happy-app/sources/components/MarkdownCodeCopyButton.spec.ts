import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error react-test-renderer does not bundle TypeScript declarations.
import { act, create } from 'react-test-renderer';

vi.mock('react-native', () => ({
    AccessibilityInfo: { announceForAccessibility: vi.fn() },
    Platform: { OS: 'android' },
    Pressable: ({ children, ...props }: Record<string, any>) => React.createElement('Pressable', props, children),
    View: ({ children, ...props }: Record<string, any>) => React.createElement('View', props, children),
}));

vi.mock('react-native-unistyles', () => {
    const theme = {
        colors: {
            divider: '#444444',
            surfaceHighest: '#242424',
            surfacePressed: '#303030',
            success: '#30d158',
            text: '#ffffff',
        },
    };
    return {
        StyleSheet: {
            create: (factory: (value: typeof theme) => unknown) => factory(theme),
        },
    };
});

vi.mock('./StyledText', () => ({
    Text: ({ children, ...props }: Record<string, any>) => React.createElement('Text', props, children),
}));

vi.mock('@/modal', () => ({
    Modal: { alert: vi.fn() },
}));

vi.mock('@/text', () => ({
    t: (key: string) => ({
        'common.copy': 'Copy',
        'common.copied': 'Copied',
        'markdown.copyCode': 'Copy code',
        'markdown.codeCopied': 'Code copied',
    }[key] ?? key),
}));

vi.mock('@/utils/copyTextToClipboard', () => ({
    copyTextToClipboard: vi.fn(),
}));

import { AccessibilityInfo, Platform } from 'react-native';
import { Modal } from '@/modal';
import { copyTextToClipboard } from '@/utils/copyTextToClipboard';
import { MarkdownCodeCopyButton, MarkdownCodeCopyButtonView } from './MarkdownCodeCopyButton';

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
            try {
                return findByProp(child, prop, value);
            } catch {
                // Continue searching sibling elements.
            }
        }
    }
    throw new Error(`Unable to find element with ${prop}=${String(value)}`);
}

function textContent(node: React.ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }
    return childrenOf(node).map(textContent).join('');
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((promiseResolve) => {
        resolve = promiseResolve;
    });
    return { promise, resolve };
}

describe('MarkdownCodeCopyButton', () => {
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

    it('shows success for the current code and resets it after two seconds', async () => {
        copyTextMock.mockResolvedValueOnce({ ok: true });
        let renderer: any;
        await act(async () => {
            renderer = create(React.createElement(MarkdownCodeCopyButton, {
                content: '  const exact = true;\n',
            }));
        });

        await act(async () => {
            await renderer.root.findByType('Pressable').props.onPress();
        });

        expect(copyTextMock).toHaveBeenCalledWith('  const exact = true;\n');
        expect(renderer.root.findByType('Pressable').props.accessibilityLabel).toBe('Code copied');
        expect(announceMock).toHaveBeenCalledWith('Code copied');

        await act(async () => {
            vi.advanceTimersByTime(2000);
        });
        expect(renderer.root.findByType('Pressable').props.accessibilityLabel).toBe('Copy code');

        await act(async () => {
            renderer.unmount();
        });
    });

    it('ignores late success and failure results after the code changes', async () => {
        const pendingSuccess = deferred<{ ok: true }>();
        copyTextMock.mockReturnValueOnce(pendingSuccess.promise);
        let renderer: any;
        await act(async () => {
            renderer = create(React.createElement(MarkdownCodeCopyButton, {
                content: 'old code',
            }));
        });

        let successPromise!: Promise<void>;
        await act(async () => {
            successPromise = renderer.root.findByType('Pressable').props.onPress();
        });
        await act(async () => {
            renderer.update(React.createElement(MarkdownCodeCopyButton, {
                content: 'new code',
            }));
        });
        await act(async () => {
            pendingSuccess.resolve({ ok: true });
            await successPromise;
        });

        expect(renderer.root.findByType('Pressable').props.accessibilityLabel).toBe('Copy code');
        expect(announceMock).not.toHaveBeenCalled();

        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const pendingFailure = deferred<{ ok: false; error: Error }>();
        copyTextMock.mockReturnValueOnce(pendingFailure.promise);
        let failurePromise!: Promise<void>;
        await act(async () => {
            failurePromise = renderer.root.findByType('Pressable').props.onPress();
        });
        await act(async () => {
            renderer.update(React.createElement(MarkdownCodeCopyButton, {
                content: 'newest code',
            }));
        });
        await act(async () => {
            pendingFailure.resolve({ ok: false, error: new Error('stale failure') });
            await failurePromise;
        });

        expect(alertMock).not.toHaveBeenCalled();

        await act(async () => {
            renderer.unmount();
        });
        consoleError.mockRestore();
    });

    it('releases the parent press guard when the control unmounts', async () => {
        const onPressChange = vi.fn();
        let renderer: any;
        await act(async () => {
            renderer = create(React.createElement(MarkdownCodeCopyButton, {
                content: 'code',
                onPressChange,
            }));
        });

        await act(async () => {
            renderer.root.findByType('Pressable').props.onPressIn();
        });
        expect(onPressChange).toHaveBeenLastCalledWith(true);

        await act(async () => {
            renderer.unmount();
        });
        expect(onPressChange).toHaveBeenLastCalledWith(false);
    });
});

describe('MarkdownCodeCopyButtonView', () => {
    it('renders a labeled copy control and forwards gesture-boundary callbacks', () => {
        const callbacks = {
            onPress: vi.fn(),
            onFocus: vi.fn(),
            onBlur: vi.fn(),
            onPressIn: vi.fn(),
            onPressOut: vi.fn(),
        };
        const element = MarkdownCodeCopyButtonView({ copied: false, ...callbacks });
        const button = findByProp(element, 'accessibilityLabel', 'Copy code');

        expect(button.props.accessibilityRole).toBe('button');
        expect(button.props.hitSlop).toBe(8);
        expect(textContent(element)).toBe('Copy');

        button.props.onFocus();
        button.props.onBlur();
        button.props.onPressIn();
        button.props.onPressOut();
        button.props.onPress();
        expect(callbacks.onFocus).toHaveBeenCalledOnce();
        expect(callbacks.onBlur).toHaveBeenCalledOnce();
        expect(callbacks.onPressIn).toHaveBeenCalledOnce();
        expect(callbacks.onPressOut).toHaveBeenCalledOnce();
        expect(callbacks.onPress).toHaveBeenCalledOnce();
    });

    it('exposes copied feedback as text and an accessibility label', () => {
        const element = MarkdownCodeCopyButtonView({
            copied: true,
            onPress: vi.fn(),
            onFocus: vi.fn(),
            onBlur: vi.fn(),
            onPressIn: vi.fn(),
            onPressOut: vi.fn(),
        });

        expect(findByProp(element, 'accessibilityLabel', 'Code copied')).toBeTruthy();
        expect(textContent(element)).toBe('Copied');
    });

    it('announces copied feedback through a live region on web', () => {
        const originalPlatform = Platform.OS;
        (Platform as { OS: string }).OS = 'web';

        try {
            const element = MarkdownCodeCopyButtonView({
                copied: true,
                onPress: vi.fn(),
                onFocus: vi.fn(),
                onBlur: vi.fn(),
                onPressIn: vi.fn(),
                onPressOut: vi.fn(),
            });
            const liveRegion = findByProp(element, 'aria-live', 'polite');

            expect(textContent(liveRegion)).toBe('Code copied');
        } finally {
            (Platform as { OS: string }).OS = originalPlatform;
        }
    });
});
