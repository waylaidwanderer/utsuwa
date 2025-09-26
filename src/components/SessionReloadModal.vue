<template>
  <BaseModal :show="show" title="Reload Session?" @close="$emit('close')">
    <p class="text-sm text-slate-600 dark:text-slate-400">
      This will reload the session. Use this after changing workspace settings.
    </p>
    <template #actions>
      <button @click="$emit('close')" class="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
        Cancel
      </button>
      <button @click="$emit('confirm')" class="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 hover:bg-blue-500">
        Reload
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue';

defineProps<{
  show: boolean;
}>();

defineEmits(['close', 'confirm']);
</script>
