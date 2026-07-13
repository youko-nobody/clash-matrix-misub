<script setup>
import RuleTemplateManager from './ServiceSettings/RuleTemplateManager.vue';

defineProps({
  settings: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <div class="space-y-6">
    <RuleTemplateManager :settings="settings" />
  </div>
</template>
