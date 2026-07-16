import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

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

import { AgentResponseCopyButtonView } from './AgentResponseCopyButton';

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
