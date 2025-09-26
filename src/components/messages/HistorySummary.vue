<template>
  <div class="flex justify-center py-2">
    <button
      @click="emit('showSummary', message)"
      class="group flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
    >
      <QueueListIcon class="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400" />
      <span>History Compressed</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { HistorySummaryMessage } from '@waylaidwanderer/sumika-types';
import { QueueListIcon } from '@heroicons/vue/24/solid';

defineProps<{
  message: HistorySummaryMessage;
}>();

const emit = defineEmits<{
  (e: 'showSummary', message: HistorySummaryMessage): void;
}>();
</script>
