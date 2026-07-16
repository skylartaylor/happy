import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
    AccessibilityInfo: { announceForAccessibility: vi.fn() },
    Platform: { OS: 'android' },
    Pressable: ({ children, ...props }: Record<string, any>) => React.createElement('Pressable', props, children),
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

import { MarkdownCodeCopyButtonView } from './MarkdownCodeCopyButton';

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
});
