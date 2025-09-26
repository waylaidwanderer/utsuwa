<template>
  <BaseModal :show="show" title="Compressed History" @close="emit('close')" max-width="2xl">
    <template #title>
      <div class="flex items-center gap-3">
        <QueueListIcon class="h-6 w-6 text-slate-500 dark:text-slate-400" />
        <h2 class="text-lg font-semibold text-heading-strong">
          Compressed History
        </h2>
      </div>
    </template>
    <template #default>
      <p class="mb-4 text-sm text-slate-600 dark:text-slate-400">
        This summary was inserted before the last ~30% of messages (since the previous summary).
      </p>
      <div class="thin-scrollbar max-h-[70vh] overflow-y-auto">
        <div class="rounded-lg bg-slate-900">
          <pre class="whitespace-pre-wrap text-sm text-slate-200 p-4">{{ summary }}</pre>
        </div>
      </div>
    </template>
    <template #actions>
      <button
        @click="emit('close')"
        class="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      >
        Close
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue';
import { QueueListIcon } from '@heroicons/vue/24/solid';

defineProps<{
  show: boolean;
  summary: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>
