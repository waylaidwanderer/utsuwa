<template>
  <BaseModal :show="show" title="Replace File?" @close="$emit('close')">
    <p class="text-sm text-slate-600 dark:text-slate-400">
      A file named <strong>{{ filename }}</strong> already exists in this workspace. Do you want to replace it? This action cannot be undone.
    </p>
    <template #actions>
      <button @click="$emit('close')" class="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
        Cancel
      </button>
      <button @click="$emit('confirm')" class="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-red-600 text-white hover:bg-red-700">
        Replace
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue';

defineProps<{
  show: boolean;
  filename: string;
}>();

defineEmits(['close', 'confirm']);
</script>
