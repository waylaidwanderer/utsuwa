<template>
  <div class="relative">
    <button
      @click.stop="isOpen = !isOpen"
      class="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-700"
      title="More options"
    >
      <EllipsisVerticalIcon class="h-5 w-5" />
    </button>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        v-on-click-outside="close"
        class="card-muted absolute right-0 mt-2 w-56 origin-top-right rounded-xl p-1 shadow-lg z-50"
      >
        <div class="py-1">
          <button
            @click="emit('toggleLayout')"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-200/60 dark:text-slate-200 dark:hover:bg-slate-700/60"
          >
            <component :is="layoutIcon" class="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <span>{{ layoutText }}</span>
          </button>
          <button
            @click="emit('reload')"
            :disabled="isBusy"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-200/60 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
          >
            <ArrowPathIcon class="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <span>Reload Session</span>
          </button>
          <button
            @click="emit('compress')"
            :disabled="isBusy || messageCount < 10"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-200/60 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
          >
            <QueueListIcon class="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <span>Compress History</span>
          </button>
          <button
            @click="emit('export')"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-200/60 dark:text-slate-200 dark:hover:bg-slate-700/60"
          >
            <ArrowDownTrayIcon class="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <span>Export Chat</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onClickOutside } from '@/directives/onClickOutside';
import {
  EllipsisVerticalIcon,
  ArrowPathIcon,
  QueueListIcon,
  Bars3BottomLeftIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ArrowDownTrayIcon,
} from '@heroicons/vue/24/solid';

const props = defineProps<{
  isBusy: boolean;
  messageCount: number;
  currentLayout: 'bubbled' | 'aligned';
}>();

const emit = defineEmits<{
  (e: 'toggleLayout'): void;
  (e: 'reload'): void;
  (e: 'compress'): void;
  (e: 'export'): void;
}>();

const vOnClickOutside = onClickOutside;
const isOpen = ref(false);

const layoutText = computed(() => `Switch to ${props.currentLayout === 'bubbled' ? 'Aligned' : 'Bubbled'} View`);
const layoutIcon = computed(() => props.currentLayout === 'bubbled' ? Bars3BottomLeftIcon : ChatBubbleOvalLeftEllipsisIcon);

function close() {
  isOpen.value = false;
}

// Close menu after an action is taken
watch(
  () => [props.isBusy],
  () => {
    if (isOpen.value) {
      close();
    }
  }
);
</script>
