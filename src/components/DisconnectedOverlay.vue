<template>
  <transition
    enter-active-class="transition transform ease-out duration-200"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition transform ease-in duration-150"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div v-if="show" class="fixed left-1/2 -translate-x-1/2 z-50" :style="{ bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))` }">
      <div class="flex items-center gap-3 px-4 py-3 rounded-full shadow-lg border border-surface-divider bg-surface-card backdrop-blur-md">
        <p class="text-sm text-slate-700 dark:text-slate-200">
          <span v-if="isReconnecting">{{ isFirstConnect ? 'Connecting…' : 'Reconnecting…' }}</span>
          <span v-else>Disconnected from agent</span>
        </p>
        <button
          v-if="!isReconnecting"
          @click="handleClick"
          class="ml-1 px-3 py-1.5 text-sm font-medium rounded-full bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          Reconnect now
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  show: boolean;
  isReconnecting: boolean;
  isFirstConnect?: boolean;
  bottomOffset?: number;
}>(), {
  isFirstConnect: false,
  bottomOffset: 16,
});

const emit = defineEmits(['reconnect']);

function handleClick() {
  emit('reconnect');
}
</script>
