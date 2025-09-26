<template>
  <div class="border-t border-surface-divider bg-surface-card px-4 py-4 backdrop-blur-lg dark:border-slate-700/60 dark:bg-slate-900/70">
    <div class="mx-auto w-full max-w-5xl">
      <div class="flex items-start space-x-3">
        <div class="relative flex-1" v-on-click-outside="sessionsStore.hideFileSearch">
          <FileSearchPopover @select="insertFile" />
          <textarea
            ref="textarea"
            v-model="prompt"
            @input="handleInput"
            @keydown="handleKeydown"
            :disabled="props.disabled"
            class="w-full resize-none rounded-2xl border border-slate-300/60 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-400/70 disabled:bg-slate-100 dark:border-slate-600/70 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder-slate-500 dark:disabled:bg-slate-800/70"
            :class="{ 'ring-2 ring-blue-300/50 animate-pulse': activeSession?.status === 'thinking' }"
            placeholder="Type your message..."
            rows="1"
          ></textarea>
        </div>
        <button
          @click="sendMessage"
          :disabled="!prompt || props.disabled"
          class="rounded-2xl bg-blue-500 p-3 text-white shadow-sm transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSessionsStore } from '@/stores/sessions';
import { storeToRefs } from 'pinia';
import { computed, ref, nextTick, watch, onMounted, onUnmounted } from 'vue';
import FileSearchPopover from './FileSearchPopover.vue';
import { onClickOutside } from '@/directives/onClickOutside';

const props = defineProps<{
  disabled?: boolean;
}>();

const sessionsStore = useSessionsStore();
const { sessions, activeSessionId, fileSearch } = storeToRefs(sessionsStore);
const prompt = ref('');
const textarea = ref<HTMLTextAreaElement | null>(null);
const atMentionStartIndex = ref(-1);

const vOnClickOutside = onClickOutside;

const activeSession = computed(() => {
  return activeSessionId.value ? sessions.value[activeSessionId.value] : null;
});

watch(() => activeSession.value?.status, async (newStatus) => {
  if (newStatus === 'idle') {
    await nextTick();
    textarea.value?.focus();
  }
}, { immediate: true });

// --- Mobile Keyboard Handling ---

function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
  };
}

const handleResize = debounce(() => {
  if (document.activeElement === textarea.value) {
    window.scrollTo(0, document.body.scrollHeight);
  }
}, 150);

onMounted(() => {
  adjustTextareaHeight();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});


// --- Component Logic ---

function adjustTextareaHeight() {
  if (textarea.value) {
    textarea.value.style.height = '1px';
    textarea.value.style.height = `${textarea.value.scrollHeight + 2}px`;
  }
}

function handleInput() {
  adjustTextareaHeight();
  const cursorPosition = textarea.value?.selectionStart ?? 0;
  const textUpToCursor = prompt.value.substring(0, cursorPosition);
  const atMatch = textUpToCursor.match(/@(\S*)$/);

  if (atMatch) {
    atMentionStartIndex.value = atMatch.index ?? -1;
    sessionsStore.updateFileSearchQuery(atMatch[1]);
  } else {
    sessionsStore.hideFileSearch();
    atMentionStartIndex.value = -1;
  }
}

function insertFile(file: string) {
  if (atMentionStartIndex.value !== -1) {
    const textBefore = prompt.value.substring(0, atMentionStartIndex.value);
    const textAfter = prompt.value.substring(textarea.value?.selectionStart ?? 0);
    prompt.value = `${textBefore}@${file} ${textAfter}`;
    sessionsStore.hideFileSearch();
    atMentionStartIndex.value = -1;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (fileSearch.value.show) {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        sessionsStore.selectPreviousFile();
        break;
      case 'ArrowDown':
        event.preventDefault();
        sessionsStore.selectNextFile();
        break;
      case 'Enter':
      case 'Tab':
        event.preventDefault();
        const selectedFile = sessionsStore.getActiveFileSearchResult();
        if (selectedFile) {
          insertFile(selectedFile);
        }
        break;
      case 'Escape':
        event.preventDefault();
        sessionsStore.hideFileSearch();
        break;
    }
  } else if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

async function sendMessage() {
  if (activeSessionId.value && prompt.value.trim()) {
    sessionsStore.sendMessage(activeSessionId.value, prompt.value.trim());
    prompt.value = '';
    await nextTick();
    adjustTextareaHeight();
  }
}
</script>
