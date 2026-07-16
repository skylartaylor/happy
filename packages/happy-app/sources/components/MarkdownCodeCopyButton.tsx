import * as React from 'react';
import { AccessibilityInfo, Platform, Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Modal } from '@/modal';
import { t } from '@/text';
import { copyTextToClipboard } from '@/utils/copyTextToClipboard';
import { Text } from './StyledText';
import { Typography } from '@/constants/Typography';

export const MarkdownCodeCopyButton = React.memo((props: {
    content: string;
    onFocusChange?: (focused: boolean) => void;
    onPressChange?: (pressed: boolean) => void;
}) => {
    const [copiedContent, setCopiedContent] = React.useState<string | null>(null);
    const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const copyAttempt = React.useRef(0);
    const latestContentRef = React.useRef(props.content);
    latestContentRef.current = props.content;

    const clearResetTimer = React.useCallback(() => {
        if (resetTimer.current) {
            clearTimeout(resetTimer.current);
            resetTimer.current = null;
        }
    }, []);

    React.useEffect(() => {
        copyAttempt.current += 1;
        clearResetTimer();
        setCopiedContent(null);
    }, [clearResetTimer, props.content]);

    React.useEffect(() => {
        return () => {
            copyAttempt.current += 1;
            clearResetTimer();
            props.onPressChange?.(false);
        };
    }, [clearResetTimer, props.onPressChange]);

    const handlePress = React.useCallback(async () => {
        const content = props.content;
        const attempt = ++copyAttempt.current;
        const result = await copyTextToClipboard(content);
        const isCurrent = attempt === copyAttempt.current
            && latestContentRef.current === content;

        if (!result.ok) {
            console.error('Failed to copy code:', result.error);
            if (isCurrent) {
                Modal.alert(t('common.error'), t('markdown.copyFailed'), [
                    { text: t('common.ok'), style: 'cancel' },
                ]);
            }
            return;
        }

        if (!isCurrent) {
            return;
        }

        clearResetTimer();
        setCopiedContent(content);
        if (Platform.OS !== 'web') {
            AccessibilityInfo.announceForAccessibility(t('markdown.codeCopied'));
        }
        resetTimer.current = setTimeout(() => {
            setCopiedContent((current) => current === content ? null : current);
            resetTimer.current = null;
        }, 2000);
    }, [clearResetTimer, props.content]);

    const handleFocus = React.useCallback(() => {
        props.onFocusChange?.(true);
    }, [props.onFocusChange]);

    const handleBlur = React.useCallback(() => {
        props.onFocusChange?.(false);
    }, [props.onFocusChange]);

    const handlePressIn = React.useCallback(() => {
        props.onPressChange?.(true);
    }, [props.onPressChange]);

    const handlePressOut = React.useCallback(() => {
        props.onPressChange?.(false);
    }, [props.onPressChange]);

    return (
        <MarkdownCodeCopyButtonView
            copied={copiedContent === props.content}
            onPress={handlePress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        />
    );
});

export function MarkdownCodeCopyButtonView(props: {
    copied: boolean;
    onPress: () => void;
    onFocus: () => void;
    onBlur: () => void;
    onPressIn: () => void;
    onPressOut: () => void;
}) {
    return (
        <>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={props.copied ? t('markdown.codeCopied') : t('markdown.copyCode')}
                onPress={props.onPress}
                onFocus={props.onFocus}
                onBlur={props.onBlur}
                onPressIn={props.onPressIn}
                onPressOut={props.onPressOut}
                hitSlop={8}
                style={({ pressed }) => [
                    styles.copyButton,
                    props.copied && styles.copyButtonCopied,
                    pressed && styles.copyButtonPressed,
                ]}
            >
                <Text style={[styles.copyButtonText, props.copied && styles.copyButtonTextCopied]}>
                    {props.copied ? t('common.copied') : t('common.copy')}
                </Text>
            </Pressable>
            {Platform.OS === 'web' && (
                <View aria-live="polite" style={styles.webAnnouncement}>
                    <Text>{props.copied ? t('markdown.codeCopied') : ''}</Text>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create((theme) => ({
    copyButton: {
        minHeight: 32,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surfaceHighest,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    copyButtonCopied: {
        borderColor: theme.colors.success,
    },
    copyButtonPressed: {
        backgroundColor: theme.colors.surfacePressed,
    },
    copyButtonText: {
        ...Typography.default(),
        color: theme.colors.text,
        fontSize: 12,
        lineHeight: 16,
    },
    copyButtonTextCopied: {
        color: theme.colors.success,
    },
    webAnnouncement: {
        position: 'absolute',
        left: -10000,
        width: 1,
        height: 1,
        overflow: 'hidden',
    },
}));
