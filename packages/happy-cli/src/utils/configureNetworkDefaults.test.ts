import {
    getDefaultAutoSelectFamilyAttemptTimeout,
    setDefaultAutoSelectFamilyAttemptTimeout,
} from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import {
    configureNetworkDefaults,
    MIN_AUTO_SELECT_FAMILY_ATTEMPT_TIMEOUT_MS,
} from './configureNetworkDefaults';

describe('configureNetworkDefaults', () => {
    const originalTimeout = getDefaultAutoSelectFamilyAttemptTimeout();

    afterEach(() => {
        setDefaultAutoSelectFamilyAttemptTimeout(originalTimeout);
    });

    it('raises Node connection attempt timeouts that are too short', () => {
        setDefaultAutoSelectFamilyAttemptTimeout(250);

        configureNetworkDefaults();

        expect(getDefaultAutoSelectFamilyAttemptTimeout()).toBe(MIN_AUTO_SELECT_FAMILY_ATTEMPT_TIMEOUT_MS);
    });

    it('preserves a longer runtime default', () => {
        const longerTimeout = MIN_AUTO_SELECT_FAMILY_ATTEMPT_TIMEOUT_MS + 1_000;
        setDefaultAutoSelectFamilyAttemptTimeout(longerTimeout);

        configureNetworkDefaults();

        expect(getDefaultAutoSelectFamilyAttemptTimeout()).toBe(longerTimeout);
    });
});
