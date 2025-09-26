<template>
  <div class="flex justify-start items-start gap-3">
    <div 
      class="p-4 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700"
      :class="{
        'max-w-xl': themeStore.chatLayout === 'bubbled',
        'w-full max-w-none': themeStore.chatLayout === 'aligned',
      }"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
          <Cog6ToothIcon class="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>
        <div>
          <div class="font-bold text-sm">
            <code>{{ message.title }}</code>
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
            <span>Status: {{ message.status }}</span>
          </div>
        </div>
      </div>

      <!-- File Operation Details -->
      <div v-if="message.details?.path" class="mt-3 text-sm border-t border-slate-200 dark:border-slate-700 pt-3">
        <p class="font-semibold text-slate-700 dark:text-slate-300">File:</p>
        <code class="text-xs bg-slate-50 dark:bg-slate-900 p-1 rounded">{{ message.details.path }}</code>
        
        <div v-if="message.details.content || message.details.oldContent" class="mt-2">
          <p class="font-semibold text-slate-700 dark:text-slate-300">{{ isDiff ? 'Changes:' : 'File Content:' }}</p>
          <div class="relative">
            <div
              v-if="isDiff"
              class="whitespace-pre-wrap font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded mt-1 text-xs text-slate-700 dark:text-slate-300 max-h-32 overflow-hidden"
            >
              <div v-if="previewLines.hasContext" class="text-slate-400 dark:text-slate-500">...</div>
              <div
                v-for="(line, index) in previewLines.lines"
                :key="index"
                :class="{
                  'bg-green-500/10 dark:bg-green-500/15': line.type === 'added',
                  'bg-red-500/10 dark:bg-red-500/15': line.type === 'removed',
                  'no-underline': true,
                }"
              >
                <span v-if="line.isHtml" v-html="line.content || ' '"></span>
                <span v-else>{{ line.content }}</span>
              </div>
            </div>
            <pre 
              v-else-if="message.details.content"
              class="whitespace-pre-wrap font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded mt-1 text-xs text-slate-700 dark:text-slate-300 max-h-32 overflow-hidden"
            ><code v-html="highlightedContentPreview"></code></pre>
            <div class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent pointer-events-none"></div>
          </div>
          <button @click="showDetails = true" class="mt-2 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
            View Full {{ isDiff ? 'Changes' : 'File' }}
          </button>
        </div>
      </div>

      <!-- Generic Input/Output -->
      <details v-if="!message.details?.path && message.input" class="mt-3 text-sm">
        <summary class="cursor-pointer font-medium text-slate-600 dark:text-slate-400">Input</summary>
        <pre class="block overflow-x-auto whitespace-pre-wrap font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded mt-1 text-xs text-slate-700 dark:text-slate-300">{{ message.input }}</pre>
      </details>
      <details v-if="!message.details?.path && message.output" class="mt-2 text-sm" open>
        <summary class="cursor-pointer font-medium text-slate-600 dark:text-slate-400">Output</summary>
        <pre class="block overflow-x-auto whitespace-pre-wrap font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded mt-1 text-xs text-slate-700 dark:text-slate-300">{{ message.output }}</pre>
      </details>

      <!-- Interactive buttons for Permission Request -->
      <div v-if="isPermissionRequest && !message.selectedOptionId" class="mt-4 flex items-center justify-end space-x-2">
        <button
          v-for="option in message.options"
          :key="option.optionId"
          @click="sendResponse(option.optionId)"
          class="px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          :class="{
            'bg-blue-500 text-white hover:bg-blue-600': option.kind.startsWith('allow'),
            'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500': !option.kind.startsWith('allow'),
          }"
        >
          {{ option.name }}
        </button>
      </div>
      <!-- Confirmation message for Permission Request -->
      <div v-if="isPermissionRequest && message.selectedOptionId" class="mt-4 text-right text-sm text-slate-500 dark:text-slate-400 italic border-t dark:border-slate-700 pt-2">
        You selected: <span class="font-semibold">{{ selectedOptionName }}</span>
      </div>
    </div>

    <ToolCallDetails
      :show="showDetails"
      :title="`${isDiff ? 'Changes for' : 'Content of'} ${message.details?.path}`"
      :content="message.details?.content || ''"
      :is-diff="isDiff"
      :full-content="message.details?.content"
      :old-content="message.details?.oldContent"
      @close="showDetails = false"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ToolCallMessage } from '@waylaidwanderer/sumika-types';
import { useSessionsStore } from '@/stores/sessions';
import { useThemeStore } from '@/stores/theme';
import { Cog6ToothIcon } from '@heroicons/vue/24/solid';
import ToolCallDetails from './ToolCallDetails.vue';
import { useDiff } from '@/composables/useDiff';
import hljs from '@/services/highlighter';
import type { DiffLine } from '@/composables/useDiff';

const props = defineProps<{
  message: ToolCallMessage;
}>();

const sessionsStore = useSessionsStore();
const themeStore = useThemeStore();
const showDetails = ref(false);

const isPermissionRequest = computed(() => props.message.status === 'awaiting_permission');

const selectedOptionName = computed(() => {
  if (!props.message.selectedOptionId) return '';
  const selectedOption = props.message.options?.find(
    (opt: { optionId: string, name: string }) => opt.optionId === props.message.selectedOptionId
  );
  return selectedOption?.name || 'Unknown';
});

function sendResponse(optionId: string) {
  const sessionId = sessionsStore.activeSessionId;
  if (sessionId && props.message.requestId !== undefined) {
    sessionsStore.sendPermissionResponse(sessionId, props.message.requestId, optionId);
  }
}

const isDiff = computed(() => {
  return props.message.details?.oldContent !== undefined && props.message.details?.oldContent !== null;
});

const { diffLines } = useDiff(
  computed(() => props.message.details?.oldContent),
  computed(() => props.message.details?.content)
);

const highlightedContentLines = computed(() => {
  const content = props.message.details?.content || '';
  if (!content) return [];

  try {
    const path = props.message.details?.path || '';
    const extension = path.split('.').pop()?.toLowerCase();
    const lang = extension && hljs.getLanguage(extension) ? extension : 'plaintext';
    
    const highlighted = hljs.highlight(content, { language: lang, ignoreIllegals: true }).value;
    return highlighted.split('\n').map(line => ({ content: line, isHtml: true }));
  } catch (e) {
    console.error("Syntax highlighting for content preview failed.", e);
    return content.split('\n').map(line => ({ content: line, isHtml: false }));
  }
});

const highlightedContentPreview = computed(() => {
  return highlightedContentLines.value.slice(0, 6).map(l => l.content || ' ').join('\n');
});

const highlightedDiffLines = computed((): (DiffLine & { isHtml?: boolean })[] => {
  if (!isDiff.value) return [];

  try {
    const path = props.message.details?.path || '';
    const extension = path.split('.').pop()?.toLowerCase();
    const lang = extension && hljs.getLanguage(extension) ? extension : 'plaintext';

    const oldCode = props.message.details?.oldContent || '';
    const newCode = props.message.details?.content || '';

    const highlightedOld = hljs.highlight(oldCode, { language: lang, ignoreIllegals: true }).value.split('\n');
    const highlightedNew = hljs.highlight(newCode, { language: lang, ignoreIllegals: true }).value.split('\n');

    const richDiffLines: (DiffLine & { isHtml?: boolean })[] = [];
    let oldLineCounter = 0;
    let newLineCounter = 0;

    for (const line of diffLines.value) {
      const richLine: DiffLine & { isHtml?: boolean } = { ...line, isHtml: true };
      if (line.type === 'added') {
        richLine.content = highlightedNew[newLineCounter] || line.content;
        newLineCounter++;
      } else if (line.type === 'removed') {
        richLine.content = highlightedOld[oldLineCounter] || line.content;
        oldLineCounter++;
      } else { // unchanged
        richLine.content = highlightedNew[newLineCounter] || line.content;
        oldLineCounter++;
        newLineCounter++;
      }
      richDiffLines.push(richLine);
    }
    return richDiffLines;
  } catch (e) {
    console.error("Syntax highlighting for diff preview failed.", e);
    return diffLines.value.map(l => ({ ...l, isHtml: false }));
  }
});

const previewLines = computed(() => {
  if (!isDiff.value) {
    return { lines: [], hasContext: false };
  }
  
  const lines = highlightedDiffLines.value;
  const firstChangeIndex = lines.findIndex(line => line.type !== 'unchanged');

  const TOTAL_PREVIEW_LINES = 6;
  const CONTEXT_BEFORE = 1;

  let startIndex = 0;
  if (firstChangeIndex > CONTEXT_BEFORE) {
      startIndex = firstChangeIndex - CONTEXT_BEFORE;
  }

  const slicedLines = lines.slice(startIndex, startIndex + TOTAL_PREVIEW_LINES);
  
  return {
    lines: slicedLines,
    hasContext: startIndex > 0,
  };
});
</script>
