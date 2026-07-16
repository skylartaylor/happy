import * as Clipboard from 'expo-clipboard';

export type CopyTextResult =
    | { ok: true }
    | { ok: false; error: unknown };

export function isCopyableText(text: string): boolean {
    return text.trim().length > 0;
}

export async function copyTextToClipboard(text: string): Promise<CopyTextResult> {
    try {
        await Clipboard.setStringAsync(text);
        return { ok: true };
    } catch (error) {
        return { ok: false, error };
    }
}
