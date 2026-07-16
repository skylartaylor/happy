import * as React from 'react';
import { AccessibilityInfo, Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Modal } from '@/modal';
import { t } from '@/text';
import { copyTextToClipboard, isCopyableText } from '@/utils/copyTextToClipboard';

type CopySnapshot = {
    messageId: string;
    text: string;
};

function isSameSnapshot(left: CopySnapshot | null, right: CopySnapshot): boolean {
    return left?.messageId === right.messageId && left.text === right.text;
}

export const AgentResponseCopyButton = React.memo((props: {
    messageId: string;
    text: string;
}) => {
    const [copiedSnapshot, setCopiedSnapshot] = React.useState<CopySnapshot | null>(null);
    const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const copyAttempt = React.useRef(0);
    const latestSnapshot = { messageId: props.messageId, text: props.text };
    const latestSnapshotRef = React.useRef(latestSnapshot);
    latestSnapshotRef.current = latestSnapshot;

    const clearResetTimer = React.useCallback(() => {
        if (resetTimer.current) {
            clearTimeout(resetTimer.current);
            resetTimer.current = null;
        }
    }, []);

    React.useEffect(() => {
        copyAttempt.current += 1;
        clearResetTimer();
        setCopiedSnapshot(null);

        return () => {
            copyAttempt.current += 1;
            clearResetTimer();
        };
    }, [clearResetTimer, props.messageId, props.text]);

    const handlePress = React.useCallback(async () => {
        const snapshot = { messageId: props.messageId, text: props.text };
        const attempt = ++copyAttempt.current;
        const result = await copyTextToClipboard(snapshot.text);
        const isCurrent = attempt === copyAttempt.current
            && isSameSnapshot(latestSnapshotRef.current, snapshot);

        if (!result.ok) {
            console.error('Failed to copy response:', result.error);
            if (isCurrent) {
                Modal.alert(t('common.error'), t('textSelection.failedToCopy'), [
                    { text: t('common.ok'), style: 'cancel' },
                ]);
            }
            return;
        }

        if (!isCurrent) {
            return;
        }

        clearResetTimer();
        setCopiedSnapshot(snapshot);
        if (Platform.OS !== 'web') {
            AccessibilityInfo.announceForAccessibility(t('message.responseCopied'));
        }
        resetTimer.current = setTimeout(() => {
            setCopiedSnapshot((current) => isSameSnapshot(current, snapshot) ? null : current);
            resetTimer.current = null;
        }, 2000);
    }, [clearResetTimer, props.messageId, props.text]);

    if (Platform.OS === 'web' || !isCopyableText(props.text)) {
        return null;
    }

    return (
        <AgentResponseCopyButtonView
            copied={isSameSnapshot(copiedSnapshot, latestSnapshot)}
            onPress={handlePress}
        />
    );
});

export function AgentResponseCopyButtonView(props: {
    copied: boolean;
    onPress: () => void;
}) {
    const { theme } = useUnistyles();

    return (
        <View style={styles.actionRow}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={props.copied ? t('message.responseCopied') : t('message.copyResponse')}
                onPress={props.onPress}
                hitSlop={8}
                style={({ pressed }) => [
                    styles.copyButton,
                    pressed && styles.copyButtonPressed,
                ]}
            >
                <Ionicons
                    name={props.copied ? 'checkmark-outline' : 'copy-outline'}
                    size={16}
                    color={props.copied ? theme.colors.success : theme.colors.textSecondary}
                />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    actionRow: {
        minHeight: 48,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    copyButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    copyButtonPressed: {
        backgroundColor: theme.colors.surfacePressed,
    },
}));
