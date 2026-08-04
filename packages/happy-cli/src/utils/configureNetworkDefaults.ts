import {
    getDefaultAutoSelectFamilyAttemptTimeout,
    setDefaultAutoSelectFamilyAttemptTimeout,
} from 'node:net';

// Node normally gives each address in its IPv4/IPv6 connection race only
// 250ms. Higher-latency networks can still be healthy while every candidate
// is rejected as ETIMEDOUT, so keep each candidate alive long enough for a
// normal TLS connection to complete.
export const MIN_AUTO_SELECT_FAMILY_ATTEMPT_TIMEOUT_MS = 5_000;

export function configureNetworkDefaults(): void {
    if (getDefaultAutoSelectFamilyAttemptTimeout() < MIN_AUTO_SELECT_FAMILY_ATTEMPT_TIMEOUT_MS) {
        setDefaultAutoSelectFamilyAttemptTimeout(MIN_AUTO_SELECT_FAMILY_ATTEMPT_TIMEOUT_MS);
    }
}
