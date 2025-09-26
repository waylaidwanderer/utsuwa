<template>
  <div>
    <!-- Bubble -->
    <div 
      class="flex items-start gap-3"
      :class="{
        'justify-end': themeStore.chatLayout === 'bubbled',
        'justify-start py-2': themeStore.chatLayout === 'aligned',
      }"
    >
      <div
        class="rounded-xl px-4 py-3 transition-shadow"
        :class="{
          'max-w-xl bg-blue-500 text-bubble-primary shadow-sm ring-1 ring-blue-400/40 hover:shadow-md dark:bg-blue-500': themeStore.chatLayout === 'bubbled',
          'w-full max-w-none border border-surface-divider bg-surface-card text-slate-800 dark:bg-slate-700 dark:text-slate-200': themeStore.chatLayout === 'aligned',
        }"
      >
        <div class="whitespace-pre-wrap font-sans text-sm leading-relaxed">
          <template v-for="(block, index) in message.content" :key="index">
            <div v-if="block.type === 'text'" class="font-sans">{{ block.text }}</div>
            <div v-else-if="block.type === 'resource'" 
                 class="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/20 px-2.5 py-1 text-xs">
              <DocumentIcon class="h-4 w-4 flex-shrink-0 text-white/80" />
              <span class="font-medium text-white">{{ getFilenameFromUri(block.resource.uri) }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="showRow" class="mt-1 flex items-center gap-1 text-xs"
         :class="{ 'justify-end': themeStore.chatLayout === 'bubbled', 'justify-start': themeStore.chatLayout === 'aligned' }">
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
            :class="badgeClass">
        <span v-if="meta?.status === 'submitted' || meta?.status === 'streaming'" class="waiting-square" aria-hidden="true">
          <span class="sq-dot" style="--i:0"></span>
          <span class="sq-dot" style="--i:1"></span>
          <span class="sq-dot" style="--i:2"></span>
          <span class="sq-dot" style="--i:3"></span>
        </span>
        <span v-else class="inline-block w-1.5 h-1.5 rounded-full" :class="dotClass"></span>
        <span>{{ statusLabel }}</span>
      </span>
      <button v-if="showRemove" @click="remove"
              class="rounded-md border border-slate-300/70 px-1.5 py-0.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600/70 dark:text-slate-300 dark:hover:bg-slate-700/70">
        Remove
      </button>
      <button v-if="showStop" @click="stop"
              class="rounded-md border border-slate-300/70 px-1.5 py-0.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600/70 dark:text-slate-300 dark:hover:bg-slate-700/70">
        Stop response
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message, UserMessage } from '@waylaidwanderer/sumika-types';
import { useThemeStore } from '@/stores/theme';
import { computed } from 'vue';
import { useSessionsStore } from '@/stores/sessions';
import { DocumentIcon } from '@heroicons/vue/24/outline';

const themeStore = useThemeStore();
const sessionsStore = useSessionsStore();

const props = defineProps<{ message: UserMessage }>();

function getFilenameFromUri(uri: string): string {
  if (!uri) return 'unknown file';
  // Handles both file:// protocol and regular paths
  const path = uri.startsWith('file://') ? uri.substring(7) : uri;
  return path.split(/[/\\]/).pop() || 'unknown file';
}

const meta = computed(() => sessionsStore.promptStateForMessage(props.message.id));

const isLastUserMessage = computed(() => {
  const sid = sessionsStore.activeSessionId;
  if (!sid) return false;
  const session = sessionsStore.sessions[sid];
  if (!session || !Array.isArray(session.messages)) return false;
  // Find the last user message in the chat history
  for (let i = session.messages.length - 1; i >= 0; i--) {
    const candidate = session.messages[i];
    if (candidate?.type === 'user') {
      return candidate.id === props.message.id;
    }
  }
  return false;
});

const hasNonUserAfter = computed(() => {
  const sid = sessionsStore.activeSessionId;
  if (!sid) return false;
  const session = sessionsStore.sessions[sid];
  if (!session || !Array.isArray(session.messages)) return false;
  const idx = session.messages.findIndex((m: Message) => m.id === props.message.id);
  if (idx < 0) return false;
  for (let i = idx + 1; i < session.messages.length; i++) {
    const nextMessage = session.messages[i];
    if (nextMessage?.type && nextMessage.type !== 'user') return true;
  }
  return false;
});

const showRow = computed(() => {
  const s = meta.value?.status;
  if (!s) return false;
  if (s === 'sent' || s === 'stopped') return false;
  // Only the last non-queued user message may show status
  if (!isLastUserMessage.value) return false;
  if (s === 'streaming' && hasNonUserAfter.value) return false;
  return true;
});

const statusLabel = computed(() => {
  switch (meta.value?.status) {
    case 'queued': return 'Queued';
    case 'sending': return 'Sending…';
    case 'submitted': return 'Waiting…';
    case 'streaming': return 'Responding…';
    case 'failed': return 'Failed';
    default: return '';
  }
});

const badgeClass = computed(() => {
  const s = meta.value?.status;
  if (s === 'queued') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  if (s === 'sending' || s === 'submitted') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
  if (s === 'streaming') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200';
  if (s === 'failed') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/45 dark:text-rose-200';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
});

const dotClass = computed(() => {
  const s = meta.value?.status;
  if (s === 'queued') return 'bg-slate-400';
  if (s === 'sending' || s === 'submitted') return 'bg-amber-500';
  if (s === 'failed') return 'bg-rose-500';
  return 'bg-slate-400';
});

const showRemove = computed(() => meta.value && ['queued','sending','submitted','failed'].includes(meta.value.status));
const showStop = computed(() => false);

function remove() {
  const sid = sessionsStore.activeSessionId;
  if (!sid) return;
  sessionsStore.removeQueuedByMessageId(sid, props.message.id);
}

function stop() {
  const sid = sessionsStore.activeSessionId;
  if (!sid) return;
  sessionsStore.stopStreamingByMessageId(sid, props.message.id);
}
</script>

<style scoped>
@reference "tailwindcss";

.waiting-square { position: relative; width: 12px; height: 12px; display: inline-block; vertical-align: middle; }
.waiting-square .sq-dot {
  position: absolute; width: 2px; height: 2px; background-color: currentColor; border-radius: 1px; opacity: 0.9;
  animation: sq-run 0.9s linear infinite; animation-delay: calc(var(--i) * 0.1s);
}
@keyframes sq-run {
  0%   { transform: translate(0px, 0px); }
  25%  { transform: translate(10px, 0px); }
  50%  { transform: translate(10px, 10px); }
  75%  { transform: translate(0px, 10px); }
  100% { transform: translate(0px, 0px); }
}
</style>
