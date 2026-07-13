<script setup>
import { computed, ref, watch } from 'vue';
import { useDataStore } from '@/stores/useDataStore.js';
import { useI18n } from '@/i18n/index.js';

const { t } = useI18n();

const props = defineProps({
  settings: {
    type: Object,
    default: null
  }
});

const dataStore = useDataStore();

const MATRIX_BASE_TARGETS = [
  'DIRECT',
  'REJECT',
  'PROXY',
  'Emby代理',
  'TG',
  'AI',
  'YOUTUBE',
  'TIKTOK',
  'FINAL',
  'BLOCK',
  'APPLE',
  'BANK',
  'FINANCE',
  'FAKE-LOCATION',
  '♻️ 自动测速'
];

const RESERVED_GROUPS = new Set([...MATRIX_BASE_TARGETS, 'REJECT-DROP']);
const matrixRuleTypes = ['DOMAIN-SUFFIX', 'DOMAIN', 'DOMAIN-KEYWORD', 'IP-CIDR', 'IP-CIDR6', 'GEOIP'];
const matrixGroupTypes = [
  { value: 'select', label: 'select 手动选择' },
  { value: 'url-test', label: 'url-test 自动测速' }
];

const newGroupName = ref('');
const newGroupType = ref('select');
const newRuleType = ref('DOMAIN-SUFFIX');
const newRuleValue = ref('');
const newRuleTarget = ref('PROXY');

function ensureMatrixSettings() {
  if (!props.settings) return;
  if (!Array.isArray(props.settings.customMatrixGroups)) props.settings.customMatrixGroups = [];
  if (!Array.isArray(props.settings.customMatrixRules)) props.settings.customMatrixRules = [];
}

const matrixGroups = computed(() => {
  ensureMatrixSettings();
  return props.settings?.customMatrixGroups || [];
});

const matrixRules = computed(() => {
  ensureMatrixSettings();
  return props.settings?.customMatrixRules || [];
});

const matrixTargetOptions = computed(() => {
  const customTargets = matrixGroups.value.map(group => group.name).filter(Boolean);
  return [...customTargets, ...MATRIX_BASE_TARGETS];
});

watch(matrixTargetOptions, (targets) => {
  if (!targets.includes(newRuleTarget.value)) {
    newRuleTarget.value = targets[0] || 'PROXY';
  }
}, { immediate: true });

function cleanMatrixText(value, maxLength = 120) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/["'\\]/g, '')
    .trim()
    .slice(0, maxLength);
}

function addMatrixGroup() {
  ensureMatrixSettings();
  const name = cleanMatrixText(newGroupName.value, 80);
  if (!name) {
    window.alert('请填写策略组名称');
    return;
  }
  if (RESERVED_GROUPS.has(name) || matrixGroups.value.some(group => group.name === name)) {
    window.alert('名称与系统默认策略组冲突或已经存在');
    return;
  }

  props.settings.customMatrixGroups.push({
    name,
    type: newGroupType.value === 'url-test' ? 'url-test' : 'select'
  });
  newGroupName.value = '';
}

function removeMatrixGroup(index) {
  ensureMatrixSettings();
  const deleted = props.settings.customMatrixGroups.splice(index, 1)[0];
  if (deleted?.name) {
    props.settings.customMatrixRules = props.settings.customMatrixRules.filter(rule => rule.target !== deleted.name);
  }
}

function addMatrixRule() {
  ensureMatrixSettings();
  const value = cleanMatrixText(newRuleValue.value, 180).replace(/,/g, '');
  if (!value) {
    window.alert('请输入目标域名、CIDR 或关键词');
    return;
  }
  props.settings.customMatrixRules.unshift({
    type: newRuleType.value,
    value,
    target: newRuleTarget.value
  });
  newRuleValue.value = '';
}

function removeMatrixRule(index) {
  ensureMatrixSettings();
  props.settings.customMatrixRules.splice(index, 1);
}

function moveMatrixRule(index, direction) {
  ensureMatrixSettings();
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= props.settings.customMatrixRules.length) return;
  const [item] = props.settings.customMatrixRules.splice(index, 1);
  props.settings.customMatrixRules.splice(nextIndex, 0, item);
}

const DEFAULT_RULE_TEMPLATE_CONTENT = `[custom]
ruleset=🎯 全球直连,[]GEOIP,CN
ruleset=🎯 全球直连,[]GEOSITE,CN
ruleset=🎯 全球直连,[]DOMAIN-SUFFIX,local
ruleset=📲 电报消息,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list
ruleset=🤖 AI 服务,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/OpenAi.list
ruleset=🎬 流媒体,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyMedia.list
ruleset=🛑 广告拦截,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list
ruleset=🐟 漏网之鱼,[]FINAL

custom_proxy_group=🚀 节点选择\`select\`[]♻️ 自动选择\`[]☑️ 手动切换\`[]DIRECT
custom_proxy_group=♻️ 自动选择\`url-test\`.*\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=☑️ 手动切换\`select\`.*
custom_proxy_group=📲 电报消息\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT
custom_proxy_group=🤖 AI 服务\`select\`[]🚀 节点选择\`[]♻️ 自动选择
custom_proxy_group=🎬 流媒体\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT
custom_proxy_group=🎯 全球直连\`select\`[]DIRECT\`[]🚀 节点选择
custom_proxy_group=🛑 广告拦截\`select\`[]REJECT\`[]DIRECT
custom_proxy_group=🐟 漏网之鱼\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT

enable_rule_generator=true
overwrite_original_rules=true`;

const blankTemplate = () => ({
  id: '',
  name: '',
  description: '',
  type: 'ini',
  content: DEFAULT_RULE_TEMPLATE_CONTENT,
  enabled: true
});

const localTemplates = ref([]);
const selectedId = ref('');
const isSaving = ref(false);
const isLoading = ref(false);

const selectedTemplate = computed(() => localTemplates.value.find(item => item.id === selectedId.value) || null);
const hasTemplates = computed(() => localTemplates.value.length > 0);

function cloneTemplates(items) {
  return JSON.parse(JSON.stringify(Array.isArray(items) ? items : []));
}

function syncFromStore() {
  localTemplates.value = cloneTemplates(dataStore.ruleTemplates);
  if (!selectedId.value && localTemplates.value[0]) {
    selectedId.value = localTemplates.value[0].id;
  }
  if (selectedId.value && !localTemplates.value.some(item => item.id === selectedId.value)) {
    selectedId.value = localTemplates.value[0]?.id || '';
  }
}

watch(() => dataStore.ruleTemplates, syncFromStore, { immediate: true, deep: true });

function createTemplate() {
  const now = Date.now().toString(36);
  const template = {
    ...blankTemplate(),
    id: `custom-${now}`,
    name: t('settings.ruleTemplateDefaultName')
  };
  localTemplates.value.unshift(template);
  selectedId.value = template.id;
}

function duplicateTemplate(template) {
  if (!template) return;
  const copy = cloneTemplates([template])[0];
  copy.id = `${template.id || 'custom'}-copy-${Date.now().toString(36)}`;
  copy.name = `${template.name || t('settings.ruleTemplateDefaultName')} ${t('settings.ruleTemplateCopySuffix')}`;
  localTemplates.value.unshift(copy);
  selectedId.value = copy.id;
}

function removeTemplate(template) {
  if (!template) return;
  localTemplates.value = localTemplates.value.filter(item => item.id !== template.id);
  selectedId.value = localTemplates.value[0]?.id || '';
}

async function refreshTemplates() {
  isLoading.value = true;
  try {
    await dataStore.fetchRuleTemplates();
    syncFromStore();
  } finally {
    isLoading.value = false;
  }
}

async function saveTemplates() {
  isSaving.value = true;
  try {
    const saved = await dataStore.saveRuleTemplates(localTemplates.value);
    localTemplates.value = cloneTemplates(saved);
    if (!localTemplates.value.some(item => item.id === selectedId.value)) {
      selectedId.value = localTemplates.value[0]?.id || '';
    }
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div v-if="settings" class="rounded-xl border border-cyan-100/80 bg-white/90 p-6 shadow-xs dark:border-cyan-900/30 dark:bg-gray-900/70">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-base font-bold text-gray-900 dark:text-gray-100">Matrix 可视化自定义规则</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          按 V5.5 的方式添加策略组和域名规则；保存设置后会注入到 Matrix 内置规则最前面。
        </p>
      </div>
      <div class="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-[11px] font-semibold text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-900/20 dark:text-cyan-200">
        规则来源：Clash Matrix Studio V5.5
      </div>
    </div>

    <div class="mt-5 grid grid-cols-1 gap-5">
      <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-white/10 dark:bg-white/5">
        <div class="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">新建策略组</div>
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_auto] lg:items-end">
          <label class="block">
            <span class="mb-1 block text-[11px] font-semibold text-gray-500">策略组名称</span>
            <input v-model="newGroupName" class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" placeholder="例如：我的流媒体" />
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] font-semibold text-gray-500">类型</span>
            <select v-model="newGroupType" class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
              <option v-for="type in matrixGroupTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
            </select>
          </label>
          <button type="button" @click="addMatrixGroup" class="whitespace-nowrap rounded-lg bg-cyan-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-700">
            创建策略组
          </button>
        </div>

        <div class="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-950">
          <p v-if="matrixGroups.length === 0" class="px-2 py-3 text-center text-xs text-gray-400">暂无额外可视化策略组</p>
          <div v-for="(group, index) in matrixGroups" :key="`${group.name}-${index}`" class="flex items-center justify-between gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/5">
            <span class="truncate text-gray-700 dark:text-gray-200"><b class="text-cyan-700 dark:text-cyan-300">{{ group.name }}</b> ({{ group.type }})</span>
            <button type="button" @click="removeMatrixGroup(index)" class="rounded-md border border-red-200 px-2 py-1 font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20">删除</button>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-white/10 dark:bg-white/5">
        <div class="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">写入域名规则</div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[180px_minmax(320px,1fr)_220px_auto] xl:items-end">
          <label class="block">
            <span class="mb-1 block text-[11px] font-semibold text-gray-500">匹配类型</span>
            <select v-model="newRuleType" class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
              <option v-for="type in matrixRuleTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] font-semibold text-gray-500">目标域名 / CIDR / 关键词</span>
            <input v-model="newRuleValue" class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" placeholder="例如：emby.media" />
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] font-semibold text-gray-500">路由去向</span>
            <select v-model="newRuleTarget" class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
              <option v-for="target in matrixTargetOptions" :key="target" :value="target">{{ target }}</option>
            </select>
          </label>
          <button type="button" @click="addMatrixRule" class="whitespace-nowrap rounded-lg bg-cyan-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-700 md:col-span-2 xl:col-span-1">
            写入规则
          </button>
        </div>

        <div class="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-950">
          <p v-if="matrixRules.length === 0" class="px-2 py-3 text-center text-xs text-gray-400">暂无可视化域名分流规则</p>
          <div v-for="(rule, index) in matrixRules" :key="`${rule.type}-${rule.value}-${index}`" class="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/5">
            <span class="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-200">
              - {{ rule.type }},{{ rule.value }},<b class="text-cyan-700 dark:text-cyan-300">{{ rule.target }}</b>
            </span>
            <button type="button" @click="moveMatrixRule(index, -1)" :disabled="index === 0" class="rounded-md border border-gray-200 px-2 py-1 font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-white/10">上移</button>
            <button type="button" @click="moveMatrixRule(index, 1)" :disabled="index === matrixRules.length - 1" class="rounded-md border border-gray-200 px-2 py-1 font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-white/10">下移</button>
            <button type="button" @click="removeMatrixRule(index)" class="rounded-md border border-red-200 px-2 py-1 font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20">删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="rounded-xl border border-emerald-100/80 bg-white/90 p-6 shadow-xs dark:border-emerald-900/30 dark:bg-gray-900/70">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-base font-bold text-gray-900 dark:text-gray-100">{{ t('settings.ruleTemplatesTitle') }}</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {{ t('settings.ruleTemplatesDesc') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          @click="refreshTemplates"
          :disabled="isLoading"
          class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
        >
          {{ isLoading ? t('settings.ruleTemplatesRefreshing') : t('settings.ruleTemplatesRefresh') }}
        </button>
        <button
          type="button"
          @click="createTemplate"
          class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          {{ t('settings.ruleTemplatesNew') }}
        </button>
        <button
          type="button"
          @click="saveTemplates"
          :disabled="isSaving"
          class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {{ isSaving ? t('settings.ruleTemplatesSaving') : t('settings.ruleTemplatesSave') }}
        </button>
      </div>
    </div>

    <div v-if="!hasTemplates" class="mt-5 rounded-xl border border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
      <p class="text-sm font-medium text-gray-600 dark:text-gray-300">{{ t('settings.ruleTemplatesEmpty') }}</p>
      <p class="mt-1 text-xs text-gray-400">{{ t('settings.ruleTemplatesEmptyHint') }}</p>
    </div>

    <div v-else class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
      <div class="space-y-2">
        <button
          v-for="template in localTemplates"
          :key="template.id"
          type="button"
          @click="selectedId = template.id"
          :class="selectedId === template.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5'"
          class="w-full rounded-lg border px-3 py-2 text-left transition"
        >
          <div class="truncate text-xs font-bold">{{ template.name || t('settings.ruleTemplateUnnamed') }}</div>
          <div class="mt-1 truncate text-[10px] opacity-70">custom:{{ template.id }}</div>
        </button>
      </div>

      <div v-if="selectedTemplate" class="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/10 dark:bg-white/5">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">{{ t('settings.ruleTemplateName') }}</span>
            <input v-model="selectedTemplate.name" class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">{{ t('settings.ruleTemplateId') }}</span>
            <input v-model="selectedTemplate.id" class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
          </label>
        </div>

        <label class="block">
          <span class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">{{ t('settings.ruleTemplateDescription') }}</span>
          <input v-model="selectedTemplate.description" :placeholder="t('settings.ruleTemplateDescriptionPlaceholder')" class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
        </label>

        <label class="block">
          <span class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">{{ t('settings.ruleTemplateContent') }}</span>
          <textarea
            v-model="selectedTemplate.content"
            rows="12"
            spellcheck="false"
            class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          ></textarea>
        </label>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <label class="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
            <input v-model="selectedTemplate.enabled" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            {{ t('settings.ruleTemplateEnabled') }}
          </label>
          <div class="flex gap-2">
            <button type="button" @click="duplicateTemplate(selectedTemplate)" class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">{{ t('actions.copy') }}</button>
            <button type="button" @click="removeTemplate(selectedTemplate)" class="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20">{{ t('actions.delete') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
