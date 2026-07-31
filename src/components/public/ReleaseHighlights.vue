<script setup>
import { computed } from 'vue';
import { useI18n } from '../../i18n/index.js';
import BaseIcon from '../ui/BaseIcon.vue';

const { t } = useI18n();

const ICONS = {
  compatibility: 'M9 12.75 11.25 15 15 9.75m4.5 2.25a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  routing: 'M5 5h14M5 12h14M5 19h14M9 3v4m6 3v4m-6 3v4',
  import: 'M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4'
};

const highlights = computed(() => [
  {
    icon: ICONS.compatibility,
    title: t('publicProfiles.releaseSsTitle'),
    description: t('publicProfiles.releaseSsDescription')
  },
  {
    icon: ICONS.routing,
    title: t('publicProfiles.releaseRulesTitle'),
    description: t('publicProfiles.releaseRulesDescription')
  },
  {
    icon: ICONS.import,
    title: t('publicProfiles.releaseImportTitle'),
    description: t('publicProfiles.releaseImportDescription')
  }
]);
</script>

<template>
  <section class="border-y border-gray-200/80 py-6 dark:border-white/10 sm:py-7" :aria-label="t('publicProfiles.releaseTitle')">
    <div class="flex flex-col gap-3 border-b border-gray-200/80 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase text-primary-700 dark:text-primary-300">
          {{ t('publicProfiles.releaseEyebrow') }}
        </p>
        <h2 class="mt-1 text-xl font-semibold text-gray-950 dark:text-white">
          {{ t('publicProfiles.releaseTitle') }}
        </h2>
        <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">
          {{ t('publicProfiles.releaseDescription') }}
        </p>
      </div>
      <span class="font-mono text-xs text-gray-500 dark:text-gray-400">v5.9.0</span>
    </div>

    <div class="mt-5 grid grid-cols-1 divide-y divide-gray-200/80 dark:divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
      <article v-for="item in highlights" :key="item.title" class="py-4 md:px-5 md:py-1 first:pl-0 last:pr-0">
        <BaseIcon :path="item.icon" className="h-5 w-5 text-primary-600 dark:text-primary-300" />
        <h3 class="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{{ item.title }}</h3>
        <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">{{ item.description }}</p>
      </article>
    </div>
  </section>
</template>
