<template>
  <div class="flex justify-start items-start gap-3">
    <div 
      class="w-full rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60"
      :class="{
        'max-w-xl': themeStore.chatLayout === 'bubbled',
        'max-w-none': themeStore.chatLayout === 'aligned',
      }"
    >
      <!-- Collapsed View -->
      <div @click="toggleExpansion" class="p-2 cursor-pointer flex items-center gap-3">
        <CpuChipIcon class="h-5 w-5 text-slate-400 flex-shrink-0" />
        <div class="flex-1 min-w-0 flex flex-col">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thought</span>
          <p class="text-sm text-slate-700 dark:text-slate-300 truncate">{{ latestThought.header }}</p>
        </div>
        <ChevronRightIcon class="h-5 w-5 text-slate-400 transition-transform" :class="{ 'rotate-90': isExpanded }" />
      </div>

      <!-- Expanded View -->
      <transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="isExpanded" class="py-4 px-4 border-t border-slate-200 dark:border-slate-600">
          <div v-for="(thought, index) in parsedThoughts" :key="index" class="flex gap-4">
            <!-- Gutter: Dot and Connector Line -->
            <div class="flex flex-col items-center">
              <div class="relative w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 ring-4 ring-slate-100 dark:ring-slate-800">
                <div v-if="index === parsedThoughts.length - 1 && !isFinalized" class="absolute inset-0 rounded-full bg-blue-500 ring-4 ring-blue-500/30 animate-pulse"></div>
              </div>
              <div v-if="index < parsedThoughts.length - 1" class="w-0.5 flex-1 bg-slate-300 dark:bg-slate-600 my-1"></div>
            </div>
            <!-- Content -->
            <div class="flex-1" :class="{ 'pb-6': index < parsedThoughts.length - 1 }">
              <p class="font-bold text-sm text-slate-800 dark:text-slate-200">{{ thought.header }}</p>
              <div class="prose prose-sm dark:prose-invert text-slate-600 dark:text-slate-400 max-w-none">
                <MemoizedMarkdown :content="thought.body" />
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ThoughtMessage } from '@waylaidwanderer/sumika-types';
import { useThemeStore } from '@/stores/theme';
import MemoizedMarkdown from './MemoizedMarkdown.vue';
import { ChevronRightIcon, CpuChipIcon } from '@heroicons/vue/24/solid';

const props = defineProps({
  messages: {
    type: Array as () => ThoughtMessage[],
    required: true
  },
  isFinalized: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['expanded']);
const themeStore = useThemeStore();

const isExpanded = ref(false);

function toggleExpansion() {
  isExpanded.value = !isExpanded.value;
  if (isExpanded.value) {
    emit('expanded');
  }
}

const parsedThoughts = computed(() => {
  return props.messages.map(msg => {
    const content = msg.content || '';
    const match = content.match(/^\*\*(.*?)\*\*\s*\n\n([\s\S]*)/);
    if (match) {
      return { header: match[1], body: match[2].trim() };
    }
    return { header: 'Thinking...', body: content.trim() };
  });
});

const latestThought = computed(() => {
  return parsedThoughts.value[parsedThoughts.value.length - 1] || { header: 'Thinking...', body: '' };
});
</script>
