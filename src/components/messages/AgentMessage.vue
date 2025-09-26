<template>
  <div class="agent-message flex flex-col items-start gap-1">
    <div
      class="min-w-0 prose prose-sm dark:prose-invert p-4 rounded-lg bg-slate-50 dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700"
      :class="{
        'max-w-xl': themeStore.chatLayout === 'bubbled',
        'w-full max-w-none': themeStore.chatLayout === 'aligned',
      }"
    >
      <MemoizedMarkdown :content="message.content" />
    </div>
    <div
      v-if="!isBranching"
      class="flex items-center gap-2"
    >
      <button
        @click="copyContent"
        :title="copyTooltip"
        class="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
      >
        <CheckIcon v-if="copied" class="h-4 w-4" />
        <ClipboardIcon v-else class="h-4 w-4" />
      </button>
      <button
        @click="handleBranch"
        title="Branch from here"
        class="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
      >
        <ShareIcon class="h-4 w-4" />
      </button>
    </div>
    <div v-else class="flex items-center gap-2">
      <ArrowPathIcon class="h-4 w-4 text-slate-500 dark:text-slate-400 animate-spin" />
      <span class="text-xs text-slate-500 dark:text-slate-400">Creating branch...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { AgentMessage as AgentMessageType } from '@waylaidwanderer/sumika-types';
import { useSessionsStore } from '@/stores/sessions';
import { useThemeStore } from '@/stores/theme';
import { ClipboardIcon, CheckIcon, ShareIcon, ArrowPathIcon } from '@heroicons/vue/24/outline';
import MemoizedMarkdown from './MemoizedMarkdown.vue';

const props = defineProps<{ message: AgentMessageType }>();
const sessionsStore = useSessionsStore();
const themeStore = useThemeStore();
const copied = ref(false);
const isBranching = ref(false);

const copyTooltip = computed(() => (copied.value ? 'Copied!' : 'Copy'));

function copyContent() {
  navigator.clipboard.writeText(props.message.content).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
}

async function handleBranch() {
  if (!sessionsStore.activeSessionId) return;
  isBranching.value = true;
  try {
    await sessionsStore.branchSession(sessionsStore.activeSessionId, props.message.id);
  } finally {
    isBranching.value = false;
  }
}
</script>