<template>
  <BaseModal :show="show" :title="title" max-width="3xl" @close="$emit('close')">
    <div class="flex flex-col">
      <!-- View Toggler -->
      <div v-if="isDiff" class="mb-3 flex justify-end">
        <div class="relative flex items-center bg-slate-200 dark:bg-slate-900 rounded-lg p-1 space-x-1 text-xs font-semibold">
          <!-- Glider -->
          <span
            class="absolute top-1 left-1 h-[calc(100%-0.5rem)] w-20 bg-white dark:bg-slate-800 rounded-md shadow transition-transform duration-300 ease-in-out"
            :style="gliderStyle"
          ></span>
          <button
            @click="currentView = 'diff'"
            class="relative z-10 w-20 py-1 rounded-md transition-colors"
            :class="{ 'text-slate-800 dark:text-slate-200': currentView === 'diff', 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200': currentView !== 'diff' }"
          >
            Diff
          </button>
          <button
            @click="currentView = 'content'"
            class="relative z-10 w-20 py-1 rounded-md transition-colors"
            :class="{ 'text-slate-800 dark:text-slate-200': currentView === 'content', 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200': currentView !== 'content' }"
          >
            Content
          </button>
        </div>
      </div>

      <!-- Code Views Container -->
      <div class="relative">
        <!-- Language Display -->
        <div v-if="detectedLanguage" class="absolute top-2 right-2 z-10 flex items-center rounded-md px-1.5 py-0.5 text-xs text-slate-400 dark:text-slate-500">
          <CodeBracketIcon class="h-4 w-4 mr-1" />
          <span class="">{{ detectedLanguage }}</span>
        </div>

        <!-- Content Display -->
        <div
          v-if="isDiff && currentView === 'diff'"
          class="thin-scrollbar max-h-[60vh] overflow-auto bg-slate-50 dark:bg-slate-900 p-2 rounded mt-1 text-slate-900 dark:text-slate-100"
        >
          <div v-for="group in diffGroups" :key="group.id">
            <!-- Collapsible Section -->
            <div v-if="group.isCollapsible" class="my-2">
              <!-- Expander Button -->
              <div class="flex items-center">
                <div class="h-px flex-grow bg-slate-200 dark:bg-slate-700"></div>
                <button
                  @click="toggleCollapse(group.id)"
                  class="flex-shrink-0 mx-2 px-3 py-1 inline-flex items-center rounded-full border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div class="relative size-4 mr-1">
                    <Transition
                      enter-active-class="transition-all duration-300 ease-in"
                      enter-from-class="opacity-0 scale-50"
                      enter-to-class="opacity-100 scale-100"
                      leave-active-class="transition-all duration-300 ease-out leave-absolute"
                      leave-from-class="opacity-100 scale-100"
                      leave-to-class="opacity-0 scale-50"
                    >
                      <ArrowsPointingOutIcon v-if="group.isCollapsed" class="size-4 absolute" />
                      <ArrowsPointingInIcon v-else class="size-4 absolute" />
                    </Transition>
                  </div>
                  {{ group.lines.length }} unchanged lines
                </button>
                <div class="h-px flex-grow bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <!-- The actual collapsible content -->
              <div
                class="overflow-hidden transition-all duration-300 ease-in-out"
                :class="{
                  'max-h-0': group.isCollapsed,
                  'max-h-[1000rem]': !group.isCollapsed, // Just a very large number
                }"
              >
                <div
                  v-for="(line, index) in group.lines"
                  :key="index"
                  class="flex w-full font-mono text-sm leading-5 -mx-2"
                >
                  <span class="flex-shrink-0 select-none w-10 text-right pr-2 text-slate-400 dark:text-slate-500">{{ line.lineNumberOld }}</span>
                  <span class="flex-shrink-0 select-none w-10 text-right pr-2 text-slate-400 dark:text-slate-500">{{ line.lineNumberNew }}</span>
                  <span v-if="line.isHtml" class="flex-grow whitespace-pre-wrap break-words pl-2" v-html="line.content"></span>
                  <span v-else class="flex-grow whitespace-pre-wrap break-words pl-2">{{ line.content }}</span>
                </div>
              </div>
            </div>
            <!-- Non-collapsible Section -->
            <template v-else>
              <div
                v-for="(line, index) in group.lines"
                :key="index"
                class="flex w-full font-mono text-sm leading-5 -mx-2"
                :class="{
                  'bg-green-500/10 dark:bg-green-500/15': line.type === 'added',
                  'bg-red-500/10 dark:bg-red-500/15': line.type === 'removed',
                }"
              >
                <span class="flex-shrink-0 select-none w-10 text-right pr-2 text-slate-400 dark:text-slate-500">{{ line.lineNumberOld }}</span>
                <span class="flex-shrink-0 select-none w-10 text-right pr-2 text-slate-400 dark:text-slate-500">{{ line.lineNumberNew }}</span>
                <span class="flex-grow whitespace-pre-wrap break-words pl-2">
                  <span
                    v-if="line.type === 'added'"
                    class="mr-2 text-green-600 dark:text-green-400"
                  >+</span>
                  <span
                    v-if="line.type === 'removed'"
                    class="mr-2 text-red-600 dark:text-red-400"
                  >-</span>
                  <span v-if="line.isHtml" v-html="line.content"></span>
                  <span v-else>{{ line.content }}</span>
                </span>
              </div>
            </template>
          </div>
        </div>
        <div v-else class="thin-scrollbar max-h-[60vh] overflow-auto bg-slate-50 dark:bg-slate-900 p-2 rounded mt-1 text-slate-900 dark:text-slate-100">
          <div
            v-for="(line, index) in displayLines"
            :key="index"
            class="flex w-full font-mono text-sm leading-5"
          >
            <span class="flex-shrink-0 select-none w-10 text-right pr-2 text-slate-400 dark:text-slate-500">{{ index + 1 }}</span>
            <span v-if="line.isHtml" class="flex-grow whitespace-pre-wrap break-words pl-2" v-html="line.content"></span>
            <span v-else class="flex-grow whitespace-pre-wrap break-words pl-2">{{ line.content }}</span>
          </div>
        </div>
      </div>
    </div>
     <template #actions>
      <button
        @click="$emit('close')"
        class="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
      >
        Close
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/vue/24/solid';
import { CodeBracketIcon } from '@heroicons/vue/24/outline';
import { ref, computed, watch } from 'vue';
import BaseModal from '@/components/BaseModal.vue';
import { useDiff } from '@/composables/useDiff';
import type { DiffLine } from '@/composables/useDiff';
import hljs from '@/services/highlighter';

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  isDiff: {
    type: Boolean,
    required: true
  },
  fullContent: {
    type: String,
    required: false
  },
  oldContent: {
    type: String,
    required: false
  }
});

defineEmits(['close']);

type View = 'diff' | 'content';
const currentView = ref<View>('diff');

type DisplayLine = DiffLine & { isHtml?: boolean };

const displayLines = ref<DisplayLine[]>([]);
const detectedLanguage = ref<string | null>(null);

const { diffLines } = useDiff(
  computed(() => props.oldContent),
  computed(() => props.fullContent)
);

watch(() => props.show, (isVisible) => {
  if (!isVisible) return;

  // Reset state
  detectedLanguage.value = null;

  // --- Progressive Enhancement: Step 1 - Show plain text immediately ---
  if (props.isDiff) {
    displayLines.value = diffLines.value;
  } else {
    displayLines.value = (props.content || '').split('\n').map(line => ({
      type: 'unchanged',
      content: line,
    }));
  }

  // --- Progressive Enhancement: Step 2 - Asynchronously highlight ---
  setTimeout(() => {
    try {
      // 1. Detect Language
      const extension = props.title.split('.').pop()?.toLowerCase();
      const lang = extension && hljs.getLanguage(extension) ? extension : null;
      detectedLanguage.value = lang || 'auto';

      // 2. Highlight full blocks of code
      const highlightedNew = hljs.highlight(props.fullContent || '', { language: detectedLanguage.value }).value.split('\n');
      
      if (props.isDiff) {
        const highlightedOld = hljs.highlight(props.oldContent || '', { language: detectedLanguage.value }).value.split('\n');
        
        // 3. Merge diff info with highlighted HTML (Two-Pass Merge)
        const richDiffLines: DisplayLine[] = [];
        let oldLineCounter = 0;
        let newLineCounter = 0;

        for (const line of diffLines.value) {
          const richLine: DisplayLine = { ...line, isHtml: true };
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
        displayLines.value = richDiffLines;

      } else { // Not a diff, just show highlighted content
        displayLines.value = highlightedNew.map(line => ({
          type: 'unchanged',
          content: line,
          isHtml: true,
        }));
      }
    } catch (e) {
      console.error("Syntax highlighting failed, falling back to plain text.", e);
      // Graceful degradation is already handled by Step 1, so we just log the error.
    }
  }, 0);
});


// --- Collapsible Diff Logic ---
interface DiffGroup {
  id: number;
  lines: DiffLine[];
  isCollapsible: boolean;
  isCollapsed: boolean;
}

const diffGroups = ref<DiffGroup[]>([]);

function toggleCollapse(groupId: number) {
  const group = diffGroups.value.find(g => g.id === groupId);
  if (group) {
    group.isCollapsed = !group.isCollapsed;
  }
}

watch([diffLines, () => props.show], ([lines, isVisible]) => {
  if (!props.isDiff || !lines || !isVisible) {
    diffGroups.value = [];
    return;
  }

              // --- Asynchronously highlight ---
              setTimeout(() => {
                try {
                  const extension = props.title.split('.').pop()?.toLowerCase();
                  const lang = extension && hljs.getLanguage(extension) ? extension : null;
                  
                  const highlightWithLang = (code: string) => lang 
                    ? hljs.highlight(code, { language: lang }) 
                    : hljs.highlightAuto(code);
        
                  const highlightResultNew = highlightWithLang(props.fullContent || '');
                  const highlightedNew = highlightResultNew.value.split('\n');
                  detectedLanguage.value = highlightResultNew.language || lang || 'detected';
        
                  const highlightedOld = highlightWithLang(props.oldContent || '').value.split('\n');
        
                  const richDiffLines: DisplayLine[] = [];
                  let oldLineCounter = 0;
                  let newLineCounter = 0;
        
                  for (const line of lines) {
                    const richLine: DisplayLine = { ...line, isHtml: true };
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
                  }      // --- Collapsible Diff Logic ---
      const CONTEXT = 3;
      const MIN_TO_COLLAPSE = CONTEXT * 2 + 2;

      const grouped: DisplayLine[][] = [];
      if (richDiffLines.length > 0) {
        let currentGroup: DisplayLine[] = [];
        for (const line of richDiffLines) {
          if (currentGroup.length > 0 && currentGroup[0].type !== line.type) {
            grouped.push(currentGroup);
            currentGroup = [];
          }
          currentGroup.push(line);
        }
        if (currentGroup.length > 0) {
          grouped.push(currentGroup);
        }
      }

      const finalGroups: DiffGroup[] = [];
      let groupId = 0;

      for (const group of grouped) {
        const isUnchangedBlock = group[0].type === 'unchanged';
        if (isUnchangedBlock && group.length > MIN_TO_COLLAPSE) {
          finalGroups.push({
            id: groupId++,
            lines: group.slice(0, CONTEXT),
            isCollapsible: false,
            isCollapsed: false,
          });
          finalGroups.push({
            id: groupId++,
            lines: group.slice(CONTEXT, group.length - CONTEXT),
            isCollapsible: true,
            isCollapsed: true,
          });
          finalGroups.push({
            id: groupId++,
            lines: group.slice(group.length - CONTEXT),
            isCollapsible: false,
            isCollapsed: false,
          });
        } else {
          finalGroups.push({
            id: groupId++,
            lines: group,
            isCollapsible: false,
            isCollapsed: false,
          });
        }
      }
      diffGroups.value = finalGroups;

    } catch (e) {
      console.error("Syntax highlighting failed, falling back to plain text.", e);
      // Fallback to plain text if highlighting fails
      diffGroups.value = [{ id: 0, lines, isCollapsible: false, isCollapsed: false }];
    }
  }, 0);
}, { immediate: true });

watch([() => props.show, currentView], ([isVisible, view]) => {
  if (!isVisible) return;
  // This watcher is for the plain content view.
  // In diff mode, it should only run when the 'content' tab is active.
  if (props.isDiff && view !== 'content') return;

  const contentToShow = props.isDiff ? (props.fullContent || '') : (props.content || '');

  // --- Progressive Enhancement: Step 1 - Show plain text immediately ---
  displayLines.value = contentToShow.split('\n').map(line => ({
    type: 'unchanged',
    content: line,
    isHtml: false,
  }));

  // --- Progressive Enhancement: Step 2 - Asynchronously highlight ---
  setTimeout(() => {
    try {
      const extension = props.title.split('.').pop()?.toLowerCase();
      const lang = extension && hljs.getLanguage(extension) ? extension : null;

      const highlightResult = lang
        ? hljs.highlight(contentToShow, { language: lang })
        : hljs.highlightAuto(contentToShow);
      
      const highlightedContent = highlightResult.value.split('\n');
      detectedLanguage.value = highlightResult.language || lang || 'detected';
      
      displayLines.value = highlightedContent.map(line => ({
        type: 'unchanged',
        content: line,
        isHtml: true,
      }));
    } catch (e) {
      console.error("Syntax highlighting failed for content view, falling back to plain text.", e);
    }
  }, 0);
}, { immediate: true });

// --- View Toggle Logic ---
const gliderStyle = computed(() => {
  const themeOrder = ['diff', 'content'];
  const activeIndex = themeOrder.indexOf(currentView.value);
  const offset = activeIndex * (5 + 0.25);
  return {
    transform: `translateX(${offset}rem)`,
  };
});

watch(() => props.show, (newVal) => {
  if (newVal && props.isDiff) {
    currentView.value = 'diff';
  }
});
</script>
