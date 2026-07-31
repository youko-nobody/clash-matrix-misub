import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../stores/useDataStore.js';
import { useToastStore } from '../stores/toast.js';
import { isChainProxyEntry, splitSubscriptionItems, mergeSubscriptionItems } from './subscriptionKinds.js';

export { isChainProxyEntry };

export function normalizeChainProxy(item = {}) {
  return {
    ...item,
    type: 'chain',
    isChainProxy: true,
    enabled: item.enabled !== false,
    name: String(item.name || '').trim(),
    frontName: String(item.frontName || item.front || item.entryNodeName || '').trim(),
    backName: String(item.backName || item.back || item.exitNodeName || '').trim(),
    url: ''
  };
}

export function useChainProxies(markDirty) {
  const dataStore = useDataStore();
  const { showToast } = useToastStore();
  const { subscriptions: allItems } = storeToRefs(dataStore);

  const chainProxies = computed(() => (allItems.value || []).filter(isChainProxyEntry).map(normalizeChainProxy));
  const enabledChainProxies = computed(() => chainProxies.value.filter(item => item.enabled !== false));

  function addChainProxy(item) {
    const { manualNodes, chainProxies: currentChains, remoteSubscriptions, others } = splitSubscriptionItems(allItems.value || []);
    dataStore.overwriteSubscriptions(mergeSubscriptionItems({
      manualNodes,
      chainProxies: [normalizeChainProxy(item), ...currentChains.map(normalizeChainProxy)],
      remoteSubscriptions,
      others
    }));
    markDirty?.();
  }

  function updateChainProxy(id, item) {
    dataStore.updateSubscription(id, normalizeChainProxy({ ...item, id }));
    markDirty?.();
  }

  function deleteChainProxy(id) {
    dataStore.removeSubscription(id);
    dataStore.removeChainProxyFromProfiles?.(id);
    markDirty?.();
  }

  function reorderChainProxies(newOrder) {
    const { manualNodes, remoteSubscriptions, others } = splitSubscriptionItems(allItems.value || []);
    const orderedChains = (newOrder || []).map(normalizeChainProxy);

    dataStore.overwriteSubscriptions(mergeSubscriptionItems({
      manualNodes,
      chainProxies: orderedChains,
      remoteSubscriptions,
      others
    }));
    markDirty?.();
    showToast?.('链式代理排序已更新，记得保存', 'success');
  }

  return {
    chainProxies,
    enabledChainProxies,
    addChainProxy,
    updateChainProxy,
    deleteChainProxy,
    reorderChainProxies
  };
}
