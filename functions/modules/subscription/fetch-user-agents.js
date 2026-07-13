import { getProcessedUserAgent } from '../../utils/format-utils.js';

export const SUBSCRIPTION_FETCH_FALLBACK_USER_AGENTS = [
    'clash-verge/v2.4.3',
    'ClashMeta',
    'Mihomo/1.19.0',
    'v2rayN/7.23',
    'Shadowrocket/1.9.0'
];

export function buildSubscriptionFetchUserAgents({
    preferredUserAgent = '',
    sourceUrl = '',
    baseUserAgent = 'v2rayN/7.23'
} = {}) {
    const preferred = typeof preferredUserAgent === 'string' ? preferredUserAgent.trim() : '';
    const inferred = getProcessedUserAgent(preferred || baseUserAgent, sourceUrl);
    const candidates = [preferred, inferred, ...SUBSCRIPTION_FETCH_FALLBACK_USER_AGENTS];
    const seen = new Set();

    return candidates.filter(candidate => {
        const ua = typeof candidate === 'string' ? candidate.trim() : '';
        if (!ua) return false;
        const key = ua.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
