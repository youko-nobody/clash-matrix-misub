<script setup>
import { computed } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps({
  chainProxies: {
    type: Array,
    default: () => []
  },
  filteredChainProxies: {
    type: Array,
    default: () => []
  },
  searchTerm: {
    type: String,
    default: ''
  },
  selectedIds: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits([
  'update:searchTerm',
  'update:selectedIds',
  'toggle-selection',
  'select-all',
  'deselect-all'
]);

const searchModel = computed({
  get: () => props.searchTerm,
  set: (val) => emit('update:searchTerm', val)
});

const orderedSelectedChains = computed({
  get() {
    const chainMap = new Map(props.chainProxies.map(item => [item.id, item]));
    return props.selectedIds
      .map(id => chainMap.get(id))
      .filter(Boolean);
  },
  set(newList) {
    emit('update:selectedIds', newList.map(item => item.id));
  }
});
</script>

<template>
  <div v-if="chainProxies.length > 0" class="space-y-2">
    <div class="flex items-center justify-between gap-3">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">选择链式代理</h4>
      <div class="space-x-2">
        <button type="button" @click="emit('select-all')" class="text-xs text-indigo-600 hover:underline">全选</button>
        <button type="button" @click="emit('deselect-all')" class="text-xs text-indigo-600 hover:underline">全不选</button>
      </div>
    </div>

    <div class="h-[42px] rounded-md border border-dashed border-indigo-200 bg-indigo-50/60 px-3 py-2 text-xs leading-5 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300">
      导出顺序：手动节点 → 链式代理 → 机场订阅
    </div>

    <div class="relative mb-2">
      <input
        v-model="searchModel"
        type="text"
        placeholder="搜索链式代理..."
        class="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 misub-radius-md shadow-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
      >
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    <div class="overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 misub-radius-md border dark:border-gray-700 h-36 lg:h-64">
      <div v-for="item in filteredChainProxies" :key="item.id">
        <label class="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            :checked="selectedIds.includes(item.id)"
            @change="emit('toggle-selection', item.id)"
            class="mt-0.5 h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500"
          >
          <span class="min-w-0">
            <span class="block truncate text-sm text-gray-800 dark:text-gray-200" :title="item.name">{{ item.name || '未命名链式代理' }}</span>
            <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400" :title="`${item.frontName} -> ${item.backName}`">
              {{ item.frontName || '未选择中转' }} → {{ item.backName || '未选择落地' }}
            </span>
          </span>
        </label>
      </div>
      <div v-if="filteredChainProxies.length === 0" class="py-4 text-center text-sm text-gray-500">
        没有匹配的链式代理
      </div>
    </div>

    <div v-if="orderedSelectedChains.length > 0" class="mt-3">
      <div class="mb-1.5 flex items-center justify-between">
        <h5 class="text-xs font-medium text-gray-500 dark:text-gray-400">
          已选 {{ orderedSelectedChains.length }} 个，可拖拽排序
        </h5>
      </div>
      <draggable
        v-model="orderedSelectedChains"
        item-key="id"
        handle=".drag-handle"
        ghost-class="opacity-40"
        class="space-y-1 p-2 bg-indigo-50 dark:bg-indigo-900/20 misub-radius-md border border-indigo-200 dark:border-indigo-800 h-32 lg:h-48 overflow-y-auto"
      >
        <template #item="{ element, index }">
          <div class="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shadow-xs">
            <span class="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
              </svg>
            </span>
            <span class="w-5 text-xs font-medium text-indigo-600 dark:text-indigo-400">{{ index + 1 }}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-gray-200" :title="element.name">
              {{ element.name || '未命名链式代理' }}
            </span>
            <button
              type="button"
              @click="emit('toggle-selection', element.id)"
              class="text-gray-400 transition-colors hover:text-red-500"
              title="移除"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </template>
      </draggable>
    </div>
  </div>
  <div v-else class="flex h-full items-center justify-center misub-radius-md bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-900/50">
    还没有链式代理，请先到“链式代理”页面创建。
  </div>
</template>
