import { NODE_PROTOCOL_REGEX } from '@/constants/nodeProtocols.js';

export function isChainProxyEntry(item) {
  return item?.isChainProxy === true || item?.type === 'chain';
}

export function isRemoteSubscriptionEntry(item) {
  const url = typeof item?.url === 'string' ? item.url.trim() : '';
  return /^https?:\/\//i.test(url) && !isChainProxyEntry(item);
}

export function isManualNodeEntry(item) {
  if (isChainProxyEntry(item)) return false;
  const url = typeof item?.url === 'string' ? item.url.trim() : '';
  return Boolean(url) && !/^https?:\/\//i.test(url) && NODE_PROTOCOL_REGEX.test(url);
}

export function splitSubscriptionItems(items = []) {
  const manualNodes = [];
  const chainProxies = [];
  const remoteSubscriptions = [];
  const others = [];

  (items || []).forEach(item => {
    if (isChainProxyEntry(item)) {
      chainProxies.push(item);
    } else if (isRemoteSubscriptionEntry(item)) {
      remoteSubscriptions.push(item);
    } else if (isManualNodeEntry(item)) {
      manualNodes.push(item);
    } else {
      others.push(item);
    }
  });

  return { manualNodes, chainProxies, remoteSubscriptions, others };
}

export function mergeSubscriptionItems({ manualNodes = [], chainProxies = [], remoteSubscriptions = [], others = [] } = {}) {
  return [...manualNodes, ...chainProxies, ...remoteSubscriptions, ...others];
}
