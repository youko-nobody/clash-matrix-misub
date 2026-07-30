<script setup>
import QRCodeOverlay from './QRCodeOverlay.vue';
import BaseIcon from '../ui/BaseIcon.vue';
import { useI18n } from '../../i18n/index.js';

defineProps({
  profile: {
    type: Object,
    required: true
  },
  isQrExpanded: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'quick-import',
  'preview',
  'copy-link',
  'toggle-qr',
  'download-qr',
  'register-canvas'
]);

const { t } = useI18n();

const ICONS = {
  profile: 'M4 7.75A2.75 2.75 0 0 1 6.75 5h10.5A2.75 2.75 0 0 1 20 7.75v8.5A2.75 2.75 0 0 1 17.25 19H6.75A2.75 2.75 0 0 1 4 16.25v-8.5ZM8 9.5h8M8 14.5h5',
  import: 'M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4',
  preview: 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z',
  link: 'M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1',
  qr: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 0 1 1-1V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1Zm12 0h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1ZM5 20h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1Z'
};
</script>

<template>
  <article class="relative border border-gray-200/80 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03] lg:p-8">
    <div class="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
      <div class="min-w-0">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center border border-gray-200 bg-gray-50 text-primary-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-primary-300">
            <BaseIcon :path="ICONS.profile" className="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('publicProfiles.profileBadge') }}</p>
            <h3 class="mt-0.5 truncate text-2xl font-semibold text-gray-950 dark:text-white">{{ profile.name }}</h3>
          </div>
        </div>
        <p class="mt-5 max-w-3xl text-base leading-7 text-gray-600 dark:text-gray-400">
          {{ profile.description || t('publicProfiles.profileFallback') }}
        </p>
      </div>

      <div class="flex w-full flex-col gap-2">
        <button
          @click="emit('quick-import', profile)"
          class="flex w-full items-center justify-center misub-radius-md bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          <BaseIcon :path="ICONS.import" className="mr-2 h-5 w-5" />
          {{ t('publicProfiles.quickImport') }}
        </button>
        <div class="grid grid-cols-3 gap-2">
          <button
            @click="emit('preview', profile)"
            class="nav-action-btn nav-action-btn-neutral misub-radius-md border border-gray-200 dark:border-white/10"
            :title="t('publicProfiles.preview')"
            :aria-label="t('publicProfiles.preview')"
          >
            <BaseIcon :path="ICONS.preview" className="h-5 w-5" />
          </button>
          <button
            @click="emit('copy-link', profile)"
            class="nav-action-btn nav-action-btn-neutral misub-radius-md border border-gray-200 dark:border-white/10"
            :title="t('publicProfiles.copy')"
            :aria-label="t('publicProfiles.copy')"
          >
            <BaseIcon :path="ICONS.link" className="h-5 w-5" />
          </button>
          <button
            @click="emit('toggle-qr', profile)"
            class="nav-action-btn nav-action-btn-neutral misub-radius-md border border-gray-200 dark:border-white/10"
            :class="{ 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400': isQrExpanded }"
            :title="isQrExpanded ? t('publicProfiles.hideQr') : t('publicProfiles.showQr')"
            :aria-label="isQrExpanded ? t('publicProfiles.hideQr') : t('publicProfiles.showQr')"
          >
            <BaseIcon :path="ICONS.qr" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>

    <QRCodeOverlay
      :profile="profile"
      :is-expanded="isQrExpanded"
      @close="emit('toggle-qr', profile)"
      @download="emit('download-qr', profile)"
      @register-canvas="(id, el) => emit('register-canvas', id, el)"
    />
  </article>
</template>
