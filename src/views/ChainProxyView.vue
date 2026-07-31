<script setup>
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../stores/useDataStore.js';
import { useToastStore } from '../stores/toast.js';
import { api } from '../lib/http.js';
import { isManualNodeEntry } from '../composables/manual-nodes/filters.js';
import { useChainProxies } from '../composables/useChainProxies.js';
import BaseIcon from '../components/ui/BaseIcon.vue';

const dataStore = useDataStore();
const { subscriptions, profiles, saveState, isDirty } = storeToRefs(dataStore);
const { showToast } = useToastStore();
const { chainProxies, addChainProxy, updateChainProxy, deleteChainProxy, reorderChainProxies } = useChainProxies(dataStore.markDirty);

const selectedProfileId = ref('');
const loadingNodes = ref(false);
const nodeLoadError = ref('');
const profileNodes = ref([]);
const selectedFrontNames = ref([]);
const selectedBackNames = ref([]);
const chainNamePrefix = ref('');
const editingId = ref('');
const nodeSearch = ref('');
const sourceFilter = ref('__all__');
const protocolFilter = ref('__all__');
const chainSearch = ref('');

const enabledManualNodes = computed(() => (subscriptions.value || []).filter(node => node.enabled !== false && isManualNodeEntry(node)));
const enabledSubscriptions = computed(() => (subscriptions.value || []).filter(sub => {
  const url = typeof sub?.url === 'string' ? sub.url.trim() : '';
  return sub.enabled !== false && /^https?:\/\//i.test(url);
}));
const enabledProfiles = computed(() => (profiles.value || []).filter(profile => profile.enabled !== false));
const selectedProfile = computed(() => {
  return (profiles.value || []).find(profile => profile.id === selectedProfileId.value || profile.customId === selectedProfileId.value) || null;
});

const chainNodes = computed(() => {
  return chainProxies.value;
});

const availableNodes = computed(() => {
  const seen = new Set();
  return profileNodes.value
    .map(node => ({
      name: String(node.name || '').trim(),
      protocol: String(node.protocol || 'unknown').toUpperCase(),
      region: String(node.region || '其他'),
      source: String(node.subscriptionName || node.group || '未知来源')
    }))
    .filter(node => {
      if (!node.name || seen.has(node.name)) return false;
      seen.add(node.name);
      return true;
    });
});

const availableNameSet = computed(() => new Set(availableNodes.value.map(node => node.name)));

const sourceOptions = computed(() => {
  return Array.from(new Set(availableNodes.value.map(node => node.source).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
});

const protocolOptions = computed(() => {
  return Array.from(new Set(availableNodes.value.map(node => node.protocol).filter(Boolean))).sort();
});

const duplicateNames = computed(() => {
  const counts = new Map();
  profileNodes.value.forEach(node => {
    const name = String(node.name || '').trim();
    if (!name) return;
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return Array.from(counts.entries()).filter(([, count]) => count > 1).map(([name]) => name);
});

const missingRules = computed(() => {
  return chainNodes.value.filter(rule => {
    const frontName = rule.frontName || rule.front;
    const backName = rule.backName || rule.back;
    return !frontName || !backName || !availableNameSet.value.has(frontName) || !availableNameSet.value.has(backName) || frontName === backName;
  });
});

const filteredNodes = computed(() => {
  const keyword = nodeSearch.value.trim().toLowerCase();
  return availableNodes.value.filter(node => {
    const matchedSearch = !keyword || [node.name, node.region, node.protocol, node.source]
      .some(value => String(value || '').toLowerCase().includes(keyword));
    const matchedSource = sourceFilter.value === '__all__' || node.source === sourceFilter.value;
    const matchedProtocol = protocolFilter.value === '__all__' || node.protocol === protocolFilter.value;
    return matchedSearch && matchedSource && matchedProtocol;
  });
});

const selectedFrontNodes = computed(() => selectedFrontNames.value.map(name => availableNodes.value.find(node => node.name === name)).filter(Boolean));
const selectedBackNodes = computed(() => selectedBackNames.value.map(name => availableNodes.value.find(node => node.name === name)).filter(Boolean));

const previewPairs = computed(() => {
  const pairs = [];
  selectedFrontNames.value.forEach(frontName => {
    selectedBackNames.value.forEach(backName => {
      if (!frontName || !backName || frontName === backName) return;
      pairs.push({ frontName, backName, key: `${frontName}\u0000${backName}` });
    });
  });
  return pairs;
});

const existingPairKeys = computed(() => {
  const keys = new Set();
  chainNodes.value.forEach(rule => {
    if (editingId.value && rule.id === editingId.value) return;
    const frontName = rule.frontName || rule.front;
    const backName = rule.backName || rule.back;
    if (frontName && backName) keys.add(`${frontName}\u0000${backName}`);
  });
  return keys;
});

const duplicatePreviewPairs = computed(() => previewPairs.value.filter(pair => existingPairKeys.value.has(pair.key)));
const validPreviewPairs = computed(() => previewPairs.value.filter(pair => !existingPairKeys.value.has(pair.key)));

const autoName = computed(() => {
  if (previewPairs.value.length !== 1) return '';
  const pair = previewPairs.value[0];
  return `链式 | ${pair.frontName} -> ${pair.backName}`;
});

const canSubmit = computed(() => {
  if (loadingNodes.value) return false;
  if (editingId.value) return previewPairs.value.length === 1;
  return validPreviewPairs.value.length > 0;
});

const filteredChainNodes = computed(() => {
  const keyword = chainSearch.value.trim().toLowerCase();
  if (!keyword) return chainNodes.value;
  return chainNodes.value.filter(rule => {
    const text = [
      rule.name,
      rule.frontName || rule.front,
      rule.backName || rule.back,
      rule.enabled === false ? '停用' : '启用'
    ].join(' ').toLowerCase();
    return text.includes(keyword);
  });
});

const stats = computed(() => ({
  nodes: availableNodes.value.length,
  chains: chainNodes.value.length,
  enabledChains: chainNodes.value.filter(rule => rule.enabled !== false).length,
  missingChains: missingRules.value.length
}));

const ICONS = {
  chain: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-1.1 1.1',
  node: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
  route: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  plus: 'M12 5v14m7-7H5',
  save: 'M5 13l4 4L19 7',
  edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10',
  search: 'M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z',
  swap: 'M7 7h11m0 0l-4-4m4 4l-4 4M17 17H6m0 0l4 4m-4-4l4-4',
  warning: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4m0 4h.01',
  arrowDown: 'M19 14l-7 7m0 0l-7-7m7 7V3',
  arrowUp: 'M5 10l7-7m0 0l7 7M12 3v18',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `chain-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const resolveProfileKey = (profile) => profile?.id || profile?.customId || '';

const toggleSelection = (collection, name) => {
  if (!name) return;
  const next = collection.value.includes(name)
    ? collection.value.filter(item => item !== name)
    : [...collection.value, name];
  collection.value = next;
};

const isFrontSelected = (name) => selectedFrontNames.value.includes(name);
const isBackSelected = (name) => selectedBackNames.value.includes(name);
const toggleFrontName = (name) => toggleSelection(selectedFrontNames, name);
const toggleBackName = (name) => toggleSelection(selectedBackNames, name);

const clearBuilder = () => {
  editingId.value = '';
  selectedFrontNames.value = [];
  selectedBackNames.value = [];
  chainNamePrefix.value = '';
};

const resetFilters = () => {
  nodeSearch.value = '';
  sourceFilter.value = '__all__';
  protocolFilter.value = '__all__';
};

const swapSelection = () => {
  const nextFront = [...selectedBackNames.value];
  selectedBackNames.value = [...selectedFrontNames.value];
  selectedFrontNames.value = nextFront;
};

const selectFiltered = (collection) => {
  const names = filteredNodes.value.map(node => node.name);
  collection.value = Array.from(new Set([...collection.value, ...names]));
};

const clearSelection = (collection) => {
  collection.value = [];
};

const selectFilteredFront = () => selectFiltered(selectedFrontNames);
const selectFilteredBack = () => selectFiltered(selectedBackNames);
const clearFrontSelection = () => clearSelection(selectedFrontNames);
const clearBackSelection = () => clearSelection(selectedBackNames);

const loadProfileNodes = async () => {
  if (!selectedProfile.value) {
    profileNodes.value = [];
    return;
  }

  loadingNodes.value = true;
  nodeLoadError.value = '';
  try {
    const data = await api.post('/api/subscription_nodes', {
      profileId: selectedProfile.value.customId || selectedProfile.value.id,
      userAgent: 'v2rayN/7.23',
      applyTransform: true
    });

    if (!data.success) {
      throw new Error(data.error || '节点预览失败');
    }
    profileNodes.value = Array.isArray(data.nodes) ? data.nodes : [];
  } catch (error) {
    profileNodes.value = [];
    nodeLoadError.value = error.message || '节点加载失败';
  } finally {
    loadingNodes.value = false;
  }
};

const ensureProfileSelected = () => {
  if (selectedProfile.value) return;
  const first = enabledProfiles.value[0] || profiles.value[0];
  selectedProfileId.value = resolveProfileKey(first);
};

const makeRuleName = (frontName, backName, isSingle) => {
  const prefix = chainNamePrefix.value.trim();
  if (isSingle && prefix) return prefix;
  return `${prefix || '链式'} | ${frontName} -> ${backName}`;
};

const handleSubmit = () => {
  if (!selectedProfile.value) {
    showToast('请先选择一个候选节点来源', 'warning');
    return;
  }
  if (!selectedFrontNames.value.length || !selectedBackNames.value.length) {
    showToast('请选择中转节点和落地节点', 'warning');
    return;
  }
  if (editingId.value && previewPairs.value.length !== 1) {
    showToast('编辑模式下一次只能保存一条链路', 'warning');
    return;
  }
  if (!previewPairs.value.length) {
    showToast('中转节点和落地节点不能相同', 'warning');
    return;
  }
  if (!editingId.value && validPreviewPairs.value.length === 0) {
    showToast('这些链路已经存在，不需要重复添加', 'warning');
    return;
  }

  const isSingle = previewPairs.value.length === 1;

  if (editingId.value) {
    const pair = previewPairs.value[0];
    const existing = chainNodes.value.find(item => item.id === editingId.value);
    const nextRule = {
      id: editingId.value,
      enabled: existing?.enabled !== false,
      name: makeRuleName(pair.frontName, pair.backName, true),
      frontName: pair.frontName,
      backName: pair.backName
    };

    updateChainProxy(editingId.value, nextRule);
    showToast('链式节点已更新，记得保存', 'success');
    clearBuilder();
    return;
  }

  const newRules = validPreviewPairs.value.map(pair => ({
    id: makeId(),
    enabled: true,
    name: makeRuleName(pair.frontName, pair.backName, isSingle),
    frontName: pair.frontName,
    backName: pair.backName
  }));

  for (let i = newRules.length - 1; i >= 0; i -= 1) {
    addChainProxy(newRules[i]);
  }
  const skipped = duplicatePreviewPairs.value.length;
  showToast(`已新增 ${newRules.length} 条链式节点${skipped ? `，跳过 ${skipped} 条重复链路` : ''}，记得保存`, 'success');
  clearBuilder();
};

const editRule = (rule) => {
  editingId.value = rule.id;
  selectedFrontNames.value = [rule.frontName || rule.front || ''].filter(Boolean);
  selectedBackNames.value = [rule.backName || rule.back || ''].filter(Boolean);
  chainNamePrefix.value = rule.name || '';
};

const toggleRule = (rule) => {
  updateChainProxy(rule.id, {
    ...rule,
    enabled: rule.enabled === false
  });
};

const deleteRule = (ruleId) => {
  deleteChainProxy(ruleId);
  if (editingId.value === ruleId) clearBuilder();
};

const cloneRule = (rule) => {
  const cloned = {
    ...rule,
    id: makeId(),
    enabled: true,
    name: `${rule.name || `链式 | ${rule.frontName} -> ${rule.backName}`} copy`
  };
  addChainProxy(cloned);
  showToast('已复制链式节点，记得保存', 'success');
};

const moveRule = (ruleId, direction) => {
  const next = [...chainNodes.value];
  const index = next.findIndex(rule => rule.id === ruleId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= next.length) return;
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);
  reorderChainProxies(next);
};

const removeInvalidRules = () => {
  if (!missingRules.value.length) return;
  const invalidIds = new Set(missingRules.value.map(rule => rule.id));
  const next = chainNodes.value.filter(rule => !invalidIds.has(rule.id));
  reorderChainProxies(next);
  if (invalidIds.has(editingId.value)) clearBuilder();
  showToast(`已清理 ${invalidIds.size} 条失效链路，记得保存`, 'success');
};

const saveNow = async () => {
  await dataStore.saveData();
};

watch(profiles, ensureProfileSelected, { immediate: true });
watch(selectedProfileId, () => {
  clearBuilder();
  resetFilters();
  loadProfileNodes();
}, { immediate: true });
</script>

<template>
  <div class="mx-auto max-w-(--breakpoint-xl) space-y-5">
    <section class="relative overflow-hidden border border-gray-100/80 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/75 misub-radius-lg">
      <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 via-sky-400 to-emerald-400 opacity-80"></div>
      <div class="flex flex-col gap-4 pt-1 lg:flex-row lg:items-center lg:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">链式代理</h1>
            <span class="inline-flex items-center gap-1.5 rounded-full border border-primary-200/80 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 dark:border-primary-400/20 dark:bg-primary-500/10 dark:text-primary-300">
              <BaseIcon :path="ICONS.chain" className="h-3.5 w-3.5" />
              Mihomo / Meta
            </span>
            <span v-if="stats.missingChains" class="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
              <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
              {{ stats.missingChains }} 条待处理
            </span>
          </div>
          <p class="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            {{ stats.nodes }} 个候选节点 · {{ stats.enabledChains }} 条启用链路
          </p>
        </div>

        <div class="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] lg:w-auto lg:min-w-[560px]">
          <select
            v-model="selectedProfileId"
            class="min-h-11 w-full border border-gray-200/80 bg-white/80 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-white/10 dark:bg-gray-800/70 dark:text-white misub-radius-lg"
            aria-label="当前订阅组"
          >
            <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
              {{ profile.name || '未命名订阅组' }}
            </option>
          </select>

          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center gap-2 border border-gray-200/80 bg-white/80 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.07] misub-radius-lg"
            :disabled="loadingNodes || !selectedProfile"
            @click="loadProfileNodes"
          >
            <BaseIcon :path="ICONS.refresh" className="h-4 w-4" :class="{ 'animate-spin': loadingNodes }" />
            {{ loadingNodes ? '读取中' : '刷新节点' }}
          </button>

          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center gap-2 bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-500/20 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 misub-radius-lg"
            :disabled="saveState === 'saving' || (!isDirty && saveState !== 'success')"
            @click="saveNow"
          >
            <BaseIcon :path="ICONS.save" className="h-4 w-4" />
            {{ saveState === 'saving' ? '保存中' : saveState === 'success' ? '已保存' : '保存更改' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="profiles.length === 0" class="border border-dashed border-gray-300 bg-white/90 p-8 text-center dark:border-white/15 dark:bg-gray-900/80 misub-radius-lg">
      <BaseIcon :path="ICONS.node" className="mx-auto h-8 w-8 text-gray-400" />
      <h2 class="mt-4 text-base font-semibold text-gray-950 dark:text-white">还没有我的订阅</h2>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">请先去“我的订阅”创建一个 Profile，再回来配置链式节点。</p>
    </section>

    <template v-else>
      <section class="border border-gray-100/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/80 misub-radius-lg">
        <div class="grid gap-3 md:grid-cols-[1fr_180px_160px_auto] md:items-center">
          <div class="relative">
            <BaseIcon :path="ICONS.search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="nodeSearch"
              type="search"
              class="block min-h-11 w-full border border-gray-200/80 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-white/10 dark:bg-gray-800/70 dark:text-white misub-radius-lg"
              placeholder="搜索节点、地区、协议、来源"
            >
          </div>
          <select
            v-model="sourceFilter"
            class="block min-h-11 w-full border border-gray-200/80 bg-white/80 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-white/10 dark:bg-gray-800/70 dark:text-white misub-radius-lg"
          >
            <option value="__all__">全部来源</option>
            <option v-for="source in sourceOptions" :key="source" :value="source">{{ source }}</option>
          </select>
          <select
            v-model="protocolFilter"
            class="block min-h-11 w-full border border-gray-200/80 bg-white/80 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-white/10 dark:bg-gray-800/70 dark:text-white misub-radius-lg"
          >
            <option value="__all__">全部协议</option>
            <option v-for="protocol in protocolOptions" :key="protocol" :value="protocol">{{ protocol }}</option>
          </select>
          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 misub-radius-lg"
            @click="resetFilters"
          >
            <BaseIcon :path="ICONS.refresh" className="h-4 w-4" />
            重置
          </button>
        </div>

        <div v-if="duplicateNames.length" class="mt-4 flex items-start gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200 misub-radius-lg">
          <BaseIcon :path="ICONS.warning" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>检测到重复节点名：{{ duplicateNames.slice(0, 5).join('、') }}{{ duplicateNames.length > 5 ? ' 等' : '' }}。链式代理按节点名匹配，建议先去重或重命名。</span>
        </div>

        <div v-if="missingRules.length" class="mt-4 flex flex-col gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between misub-radius-lg">
          <div class="flex items-start gap-3">
            <BaseIcon :path="ICONS.warning" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>有 {{ missingRules.length }} 条链路引用的节点不存在或前后置相同，导出时会被跳过。</span>
          </div>
          <button type="button" class="bg-amber-100 px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-200 dark:bg-amber-400/15 dark:text-amber-100 misub-radius-md" @click="removeInvalidRules">
            清理失效链路
          </button>
        </div>
      </section>

      <section class="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div class="space-y-5">
          <div class="grid gap-5 lg:grid-cols-2">
            <div class="border border-gray-100/80 bg-white/90 shadow-sm dark:border-white/10 dark:bg-gray-900/80 misub-radius-lg">
              <div class="border-b border-gray-100 p-4 dark:border-white/10 sm:p-5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h2 class="text-base font-semibold text-gray-950 dark:text-white">中转节点</h2>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">流量入口，先连接这里。</p>
                  </div>
                  <span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">{{ selectedFrontNames.length }} 已选</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <button type="button" class="bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 misub-radius-md" @click="selectFilteredFront">
                    全选当前
                  </button>
                  <button type="button" class="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 misub-radius-md" @click="clearFrontSelection">
                    清空
                  </button>
                </div>
              </div>

              <div v-if="loadingNodes" class="p-5 text-sm text-gray-500 dark:text-gray-400">正在读取节点列表...</div>
              <div v-else-if="nodeLoadError" class="p-5 text-sm text-red-600 dark:text-red-300">{{ nodeLoadError }}</div>
              <div v-else-if="filteredNodes.length === 0" class="p-8 text-center text-sm text-gray-500 dark:text-gray-400">没有匹配的节点</div>
              <div v-else class="max-h-[560px] space-y-2 overflow-auto p-3">
                <button
                  v-for="node in filteredNodes"
                  :key="`front-${node.name}`"
                  type="button"
                  class="grid min-h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-3 border px-3 py-3 text-left transition misub-radius-md"
                  :class="isFrontSelected(node.name) ? 'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-100' : 'border-gray-100 bg-gray-50 text-gray-900 hover:border-blue-200 hover:bg-blue-50/60 dark:border-white/10 dark:bg-white/[0.035] dark:text-gray-100 dark:hover:bg-blue-400/10'"
                  @click="toggleFrontName(node.name)"
                >
                  <span class="flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold" :class="isFrontSelected(node.name) ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-300 text-transparent dark:border-white/20'">✓</span>
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-semibold">{{ node.name }}</span>
                    <span class="mt-1 block truncate text-xs text-gray-500 dark:text-gray-400">{{ node.protocol }} · {{ node.region }} · {{ node.source }}</span>
                  </span>
                  <span class="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-500 shadow-sm dark:bg-black/20 dark:text-gray-300">{{ node.protocol }}</span>
                </button>
              </div>
            </div>

            <div class="border border-gray-100/80 bg-white/90 shadow-sm dark:border-white/10 dark:bg-gray-900/80 misub-radius-lg">
              <div class="border-b border-gray-100 p-4 dark:border-white/10 sm:p-5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h2 class="text-base font-semibold text-gray-950 dark:text-white">落地节点</h2>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">最终出口，对外显示这个节点。</p>
                  </div>
                  <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">{{ selectedBackNames.length }} 已选</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <button type="button" class="bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 misub-radius-md" @click="selectFilteredBack">
                    全选当前
                  </button>
                  <button type="button" class="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 misub-radius-md" @click="clearBackSelection">
                    清空
                  </button>
                </div>
              </div>

              <div v-if="loadingNodes" class="p-5 text-sm text-gray-500 dark:text-gray-400">正在读取节点列表...</div>
              <div v-else-if="nodeLoadError" class="p-5 text-sm text-red-600 dark:text-red-300">{{ nodeLoadError }}</div>
              <div v-else-if="filteredNodes.length === 0" class="p-8 text-center text-sm text-gray-500 dark:text-gray-400">没有匹配的节点</div>
              <div v-else class="max-h-[560px] space-y-2 overflow-auto p-3">
                <button
                  v-for="node in filteredNodes"
                  :key="`back-${node.name}`"
                  type="button"
                  class="grid min-h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-3 border px-3 py-3 text-left transition misub-radius-md"
                  :class="isBackSelected(node.name) ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100' : 'border-gray-100 bg-gray-50 text-gray-900 hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-white/10 dark:bg-white/[0.035] dark:text-gray-100 dark:hover:bg-emerald-400/10'"
                  @click="toggleBackName(node.name)"
                >
                  <span class="flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold" :class="isBackSelected(node.name) ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-gray-300 text-transparent dark:border-white/20'">✓</span>
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-semibold">{{ node.name }}</span>
                    <span class="mt-1 block truncate text-xs text-gray-500 dark:text-gray-400">{{ node.protocol }} · {{ node.region }} · {{ node.source }}</span>
                  </span>
                  <span class="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-500 shadow-sm dark:bg-black/20 dark:text-gray-300">{{ node.region }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside class="space-y-5">
          <div class="border border-gray-100/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/80 misub-radius-lg">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-gray-950 dark:text-white">{{ editingId ? '编辑链路' : '生成链路' }}</h2>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ selectedFrontNames.length }} 中转 · {{ selectedBackNames.length }} 落地 · {{ validPreviewPairs.length }} 可新增</p>
              </div>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white misub-radius-md"
                title="互换中转和落地"
                @click="swapSelection"
              >
                <BaseIcon :path="ICONS.swap" className="h-4 w-4" />
              </button>
            </div>

            <div class="mt-5 space-y-4">
              <div>
                <label class="text-xs font-medium text-gray-600 dark:text-gray-300">{{ previewPairs.length > 1 ? '节点名前缀' : '链式节点名称' }}</label>
                <input
                  v-model="chainNamePrefix"
                  type="text"
                  class="mt-1.5 block min-h-11 w-full border border-gray-200/80 bg-white/80 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-white/10 dark:bg-gray-800/70 dark:text-white misub-radius-lg"
                  :placeholder="autoName || '链式'"
                >
              </div>

              <div class="border border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.035] misub-radius-lg">
                <div class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span class="h-2 w-2 rounded-full bg-blue-500"></span>
                  <span>本机</span>
                  <span>→</span>
                  <span class="truncate">{{ selectedFrontNames[0] || '中转节点' }}</span>
                </div>
                <div class="mt-3 flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span class="truncate">{{ selectedBackNames[0] || '落地节点' }}</span>
                  <span>→</span>
                  <span>目标网站</span>
                </div>
              </div>

              <div v-if="duplicatePreviewPairs.length" class="border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200 misub-radius-lg">
                {{ duplicatePreviewPairs.length }} 条链路已存在，将自动跳过。
              </div>

              <div v-if="previewPairs.length" class="max-h-44 space-y-2 overflow-auto border border-gray-100 p-2 dark:border-white/10 misub-radius-lg">
                <div
                  v-for="pair in previewPairs.slice(0, 20)"
                  :key="pair.key"
                  class="px-3 py-2 text-xs misub-radius-md"
                  :class="existingPairKeys.has(pair.key) ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-gray-50 text-gray-600 dark:bg-white/[0.035] dark:text-gray-300'"
                >
                  {{ pair.frontName }} -> {{ pair.backName }}
                </div>
                <p v-if="previewPairs.length > 20" class="px-3 pb-1 text-xs text-gray-400">还有 {{ previewPairs.length - 20 }} 条未显示</p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <button
                  v-if="editingId"
                  type="button"
                  class="inline-flex min-h-11 items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 misub-radius-lg"
                  @click="clearBuilder"
                >
                  取消
                </button>
                <button
                  type="button"
                  class="inline-flex min-h-11 items-center justify-center gap-2 bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-500/20 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 misub-radius-lg"
                  :class="editingId ? '' : 'col-span-2'"
                  :disabled="!canSubmit"
                  @click="handleSubmit"
                >
                  <BaseIcon :path="ICONS.plus" className="h-4 w-4" />
                  {{ editingId ? '保存链路' : `新增 ${validPreviewPairs.length || ''} 条` }}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section class="border border-gray-100/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/80 misub-radius-lg">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-semibold text-gray-950 dark:text-white">当前链式节点</h2>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              导出时额外生成这些节点，普通原始节点不受影响。
            </p>
          </div>
          <div class="relative sm:w-72">
            <BaseIcon :path="ICONS.search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="chainSearch"
              type="search"
              class="block min-h-11 w-full border border-gray-200/80 bg-white/80 py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-white/10 dark:bg-gray-800/70 dark:text-white misub-radius-lg"
              placeholder="搜索链式节点"
            >
          </div>
        </div>

        <div v-if="filteredChainNodes.length" class="mt-5 divide-y divide-gray-100 overflow-hidden border border-gray-100 dark:divide-white/10 dark:border-white/10 misub-radius-lg">
          <div
            v-for="(rule, index) in filteredChainNodes"
            :key="rule.id"
            class="grid gap-3 bg-white/70 p-4 dark:bg-transparent lg:grid-cols-[1fr_auto] lg:items-center"
            :class="rule.enabled === false ? 'opacity-55' : ''"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="rule.enabled === false ? 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400' : 'bg-primary-50 text-primary-700 dark:bg-primary-400/10 dark:text-primary-300'">
                  {{ rule.enabled === false ? '停用' : '启用' }}
                </span>
                <span v-if="missingRules.some(item => item.id === rule.id)" class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">节点缺失</span>
                <h3 class="truncate text-sm font-semibold text-gray-950 dark:text-white">{{ rule.name || `链式 | ${rule.frontName} -> ${rule.backName}` }}</h3>
              </div>
              <div class="mt-3 grid gap-2 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <span class="truncate bg-blue-50 px-3 py-2 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200 misub-radius-md">{{ rule.frontName || rule.front || '未选择中转' }}</span>
                <span class="hidden text-gray-300 dark:text-gray-600 sm:block">→</span>
                <span class="truncate bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200 misub-radius-md">{{ rule.backName || rule.back || '未选择落地' }}</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-35 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white misub-radius-md"
                title="上移"
                :disabled="index === 0 || Boolean(chainSearch)"
                @click="moveRule(rule.id, -1)"
              >
                <BaseIcon :path="ICONS.arrowUp" className="h-4 w-4" />
              </button>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-35 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white misub-radius-md"
                title="下移"
                :disabled="index === filteredChainNodes.length - 1 || Boolean(chainSearch)"
                @click="moveRule(rule.id, 1)"
              >
                <BaseIcon :path="ICONS.arrowDown" className="h-4 w-4" />
              </button>
              <button
                type="button"
                class="px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 misub-radius-md"
                @click="toggleRule(rule)"
              >
                {{ rule.enabled === false ? '启用' : '停用' }}
              </button>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white misub-radius-md"
                title="复制"
                @click="cloneRule(rule)"
              >
                <BaseIcon :path="ICONS.copy" className="h-4 w-4" />
              </button>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white misub-radius-md"
                title="编辑"
                @click="editRule(rule)"
              >
                <BaseIcon :path="ICONS.edit" className="h-4 w-4" />
              </button>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 misub-radius-md"
                title="删除"
                @click="deleteRule(rule.id)"
              >
                <BaseIcon :path="ICONS.trash" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div v-else class="mt-5 border border-dashed border-gray-300 px-4 py-8 text-center dark:border-white/15 misub-radius-lg">
          <BaseIcon :path="ICONS.chain" className="mx-auto h-7 w-7 text-gray-400" />
          <h3 class="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{{ chainNodes.length ? '没有匹配的链式节点' : '还没有链式节点' }}</h3>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">从上方选择中转和落地节点，然后新增链路。</p>
        </div>
      </section>
    </template>
  </div>
</template>
