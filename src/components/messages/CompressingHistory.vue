<template>
  <div class="flex justify-center py-2">
    <div
      class="group flex animate-pulse items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
    >
      <ArrowPathIcon
        class="h-4 w-4 animate-spin text-slate-400 dark:text-slate-500"
      />
      <span>Compressing history...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowPathIcon } from '@heroicons/vue/24/solid';
</script>
