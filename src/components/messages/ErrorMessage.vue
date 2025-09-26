<template>
  <div class="flex justify-start items-start gap-3">
    <div 
      class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 shadow-md border border-red-200 dark:border-red-500/30"
      :class="{
        'max-w-xl': themeStore.chatLayout === 'bubbled',
        'w-full max-w-none': themeStore.chatLayout === 'aligned',
      }"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <ExclamationTriangleIcon class="h-5 w-5 text-red-500" />
        </div>
        <div>
          <div class="font-bold text-sm">Agent Error</div>
          <div class="text-xs text-red-700 dark:text-red-400">
            Code: {{ errorCode }}
          </div>
        </div>
      </div>

      <p class="mt-3 text-sm">
        {{ errorMessage }}
      </p>

      <details v-if="showDetails" class="mt-3 text-sm">
        <summary class="cursor-pointer font-medium text-red-600 dark:text-red-400">Details</summary>
        <pre class="whitespace-pre-wrap font-mono bg-red-100 dark:bg-red-900/50 p-2 rounded mt-1 text-xs">{{ JSON.stringify(message.error.data, null, 2) }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ErrorMessage } from '@waylaidwanderer/sumika-types';
import { useThemeStore } from '@/stores/theme';
import { ExclamationTriangleIcon } from '@heroicons/vue/24/solid';

const props = defineProps<{ message: ErrorMessage }>();
const themeStore = useThemeStore();

const errorCode = computed(() => props.message.error.code || 'Unknown');

const isSimpleDetails = computed(() => {
  const data = props.message.error.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const keys = Object.keys(data);
    return keys.length === 1 && keys[0] === 'details' && typeof data.details === 'string';
  }
  return false;
});

const errorMessage = computed(() => {
  if (isSimpleDetails.value) {
    return props.message.error.data.details;
  }
  
  const details = props.message.error.data?.details;
  if (typeof details === 'string') {
    const jsonMatch = details.match(/{.*}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error && parsed.error.status && parsed.error.message) {
          return `${parsed.error.status} - ${parsed.error.message}`;
        }
      } catch { /* Fall through */ }
    }
  }

  return props.message.error.message || 'Internal error';
});

const showDetails = computed(() => {
  if (!props.message.error.data) {
    return false;
  }
  return !isSimpleDetails.value;
});
</script>
