<template>
  <div class="flex h-full flex-col bg-surface-base">
    <div class="relative z-30 border-b border-surface-divider bg-surface-card backdrop-blur">
      <header class="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <div class="flex items-center min-w-0">
          <router-link
            :to="{ name: 'workspace-detail', params: { workspaceId: route.params.workspaceId } }"
            class="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ArrowLeftIcon class="h-6 w-6" />
          </router-link>
          <div v-if="activeSession" class="ml-2 flex items-center min-w-0">
            <div
              v-if="activeSession.status === 'disconnected'"
              class="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 mr-2 shrink-0"
              title="Disconnected"
            ></div>
            <h1 class="truncate text-lg font-semibold text-heading-strong">
              {{ activeSession.name }}
            </h1>
          </div>
        </div>
        <div v-if="activeSession" class="flex items-center gap-2">
          <ChatHeaderMenu
            :is-busy="sessionsStore.isCompressing || activeSession.status !== 'idle'"
            :message-count="activeSession.messages?.length ?? 0"
            :current-layout="themeStore.chatLayout"
            @toggle-layout="toggleLayout"
            @reload="isReloadModalOpen = true"
            @compress="handleCompressHistory"
            @export="handleExport"
          />
        </div>
      </header>
    </div>

    
    <div
      ref="scrollContainer"
      class="thin-scrollbar flex-1 min-h-0 overflow-y-auto"
      @scroll="handleScroll"
    >
      <div class="mx-auto w-full max-w-5xl px-6 py-6">
        <div v-if="activeSession" class="space-y-4">
          <template v-for="item in groupedMessages" :key="item.id">
            <div class="animate-chat-fade-up">
              <ThoughtsTimeline
                v-if="item.type === 'thought_group'"
                :messages="item.messages"
                :is-finalized="item.isFinalized"
                @expanded="handleThoughtExpansion"
              />
              <ChatMessage v-else :message="item" @showSummary="handleShowSummary" />
            </div>
          </template>

          <CompressingHistory v-if="sessionsStore.isCompressing" />
          
          <div v-if="queuedTail.length" class="space-y-4">
            <div v-for="q in queuedTail" :key="q.id">
              
              <div class="flex items-start gap-3"
                   :class="{ 'justify-end': themeStore.chatLayout === 'bubbled', 'justify-start py-1': themeStore.chatLayout === 'aligned' }">
                <div class="rounded-xl px-4 py-3"
                     :class="{
                       'max-w-xl bg-blue-500 text-bubble-primary shadow-sm dark:bg-blue-500': themeStore.chatLayout === 'bubbled',
                       'w-full max-w-none border border-surface-divider bg-surface-card text-slate-800 dark:text-slate-100': themeStore.chatLayout === 'aligned',
                     }">
                  <pre class="whitespace-pre-wrap font-sans text-sm">{{ q.content }}</pre>
                </div>
              </div>

              <div class="mt-1 flex items-center gap-2 text-xs"
                   :class="{ 'justify-end': themeStore.chatLayout === 'bubbled', 'justify-start': themeStore.chatLayout === 'aligned' }">
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                      :class="{
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300': q.status==='queued' || q.status==='failed',
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200': q.status==='sending' || q.status==='submitted',
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200': q.status==='streaming'
                      }">
                <span v-if="q.status==='submitted' || q.status==='streaming'" class="waiting-square" aria-hidden="true">
                  <span class="sq-dot" style="--i:0"></span>
                  <span class="sq-dot" style="--i:1"></span>
                  <span class="sq-dot" style="--i:2"></span>
                  <span class="sq-dot" style="--i:3"></span>
                </span>
                <span v-else class="inline-block w-1.5 h-1.5 rounded-full"
                      :class="{
                        'bg-slate-400': q.status==='queued' || q.status==='failed',
                        'bg-amber-500': q.status==='sending'
                      }"></span>
                  <span>{{ q.status === 'queued' ? 'Queued' : q.status === 'failed' ? 'Failed' : q.status === 'sending' ? 'Sending…' : q.status === 'submitted' ? 'Waiting…' : q.status === 'streaming' ? 'Responding…' : '' }}</span>
                </span>
                <button v-if="q.status==='queued' || q.status==='sending' || q.status==='submitted' || q.status==='failed'"
                        @click="removeQueued(q.id)"
                        class="rounded-md border border-surface-divider px-1.5 py-0.5 text-slate-600 transition-colors hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-700/70">
                  Remove
                </button>
              </div>
            </div>
          </div>
          
          <!-- Persistent bottom padding so floating controls never overlap -->
          <div :style="{ height: `${bottomPad}px` }"></div>
        </div>
        <div v-else class="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
          <p>Loading session...</p>
        </div>
      </div>
    </div>

    <!-- Scroll to Bottom Button -->
    <transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <button
        v-if="isUserScrolledUp"
        @click="() => scrollToBottom(true)"
        class="absolute right-6 rounded-full border border-surface-divider bg-surface-card p-2 text-slate-600 shadow-md backdrop-blur transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300"
        :style="{ bottom: `calc(${scrollBtnBottom}px + env(safe-area-inset-bottom))` }"
      >
        <ArrowDownIcon class="h-8 w-8" />
      </button>
    </transition>

    <!-- Floating Stop Response control -->
    <transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <button
        v-if="isStreaming"
        @click="stopStreaming"
        class="absolute right-6 rounded-full shadow-lg bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 px-3 py-2 flex items-center gap-2"
        :style="{ bottom: `calc(${stopBtnBottom}px + env(safe-area-inset-bottom))` }"
        title="Stop response"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M5.25 5.25h13.5v13.5H5.25z" /></svg>
        <span>Stop</span>
      </button>
    </transition>

    
    <div ref="chatInputEl">
      <ChatInput :disabled="sessionsStore.isCompressing" />
    </div>

  
  <SessionReloadModal
    :show="isReloadModalOpen"
    @close="isReloadModalOpen = false"
    @confirm="handleReloadConfirm"
  />

    
  <DisconnectedOverlay
    :show="!!activeSession && (activeSession.status === 'disconnected' || activeSession.status === 'reinitializing')"
    :isReconnecting="activeSession?.status === 'reinitializing'"
    :isFirstConnect="activeSessionId ? !sessionsStore.everConnected[activeSessionId] : true"
    :bottomOffset="overlayOffset"
    @reconnect="activeSessionId && sessionsStore.reconnectSession(activeSessionId)"
  />
  <HistorySummaryModal
    :show="isSummaryModalOpen"
    :summary="selectedSummary"
    @close="isSummaryModalOpen = false"
  />
</div>
</template>

<script setup lang="ts">
import { useSessionsStore } from '@/stores/sessions';
import { useWorkspacesStore } from '@/stores/workspaces';
import { useThemeStore } from '@/stores/theme';
import { storeToRefs } from 'pinia';
import { computed, watch, ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import ChatMessage from './ChatMessage.vue';
import ChatInput from './ChatInput.vue';
import ThoughtsTimeline from './messages/ThoughtsTimeline.vue';
import CompressingHistory from './messages/CompressingHistory.vue';
import SessionReloadModal from './SessionReloadModal.vue';
import DisconnectedOverlay from './DisconnectedOverlay.vue';
import ChatHeaderMenu from './ChatHeaderMenu.vue';
import { ArrowLeftIcon, ArrowDownIcon } from '@heroicons/vue/24/solid';
import type { Message as MessageType, ThoughtMessage, HistorySummaryMessage } from '@waylaidwanderer/sumika-types';
import HistorySummaryModal from './HistorySummaryModal.vue';

const sessionsStore = useSessionsStore();
const { sessions, activeSessionId } = storeToRefs(sessionsStore);
const workspacesStore = useWorkspacesStore();
const themeStore = useThemeStore();
const route = useRoute();
const toast = useToast();
const scrollContainer = ref<HTMLElement | null>(null);
const isUserScrolledUp = ref(false);
const isReloadModalOpen = ref(false);
const isSummaryModalOpen = ref(false);
const selectedSummary = ref('');
const chatInputEl = ref<HTMLElement | null>(null);
const inputHeight = ref(88);
let ro: ResizeObserver | null = null;

onMounted(() => {
  sessionsStore.creationProcessComplete();
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener('scroll', handleScroll);
  }
  if (chatInputEl.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      inputHeight.value = Math.max(48, Math.round(r.height));
    });
    ro.observe(chatInputEl.value);
  }
});

onUnmounted(() => {
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener('scroll', handleScroll);
  }
  if (ro) {
    ro.disconnect();
    ro = null;
  }
});

const activeSession = computed(() => {
  return activeSessionId.value ? sessions.value[activeSessionId.value] : null;
});

type ChatDisplayMessage = Exclude<MessageType, ThoughtMessage>;
type DisplayItem = ChatDisplayMessage | {
  id: string;
  type: 'thought_group';
  messages: ThoughtMessage[];
  isFinalized: boolean
};

const groupedMessages = computed((): DisplayItem[] => {
  if (!activeSession.value || !Array.isArray(activeSession.value.messages)) {
    return [];
  }

  const summaries = activeSession.value.messages.filter(m => m.type === 'history_summary');
  const messages = activeSession.value.messages.filter(m => m.type !== 'history_summary');

  const result: DisplayItem[] = [];
  let thoughtGroup: ThoughtMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    if (message && message.type === 'thought') {
      thoughtGroup.push(message);
    } else {
      if (thoughtGroup.length > 0) {
        result.push({
          id: `thought-group-${thoughtGroup[0].id}`,
          type: 'thought_group',
          messages: thoughtGroup,
          isFinalized: true,
        });
        thoughtGroup = [];
      }
      if (message) {
        result.push(message as ChatDisplayMessage);
      }
    }

    const summary = summaries.find(s => (s as HistorySummaryMessage).after === message.id);
    if (summary) {
      result.push(summary as ChatDisplayMessage);
    }
  }

  // Handle any trailing thought group that is still "live"
  if (thoughtGroup.length > 0) {
    result.push({
      id: `thought-group-${thoughtGroup[0].id}`,
      type: 'thought_group',
      messages: thoughtGroup,
      isFinalized: false,
    });
  }

  return result;
});

function scrollToBottom(force = false) {
  if (scrollContainer.value && (!isUserScrolledUp.value || force)) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
}

function handleScroll() {
  if (scrollContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
    // Add a 50px threshold to account for variations
    if (scrollHeight - scrollTop - clientHeight > 50) {
      isUserScrolledUp.value = true;
    }
    else {
      isUserScrolledUp.value = false;
    }
  }
}

async function handleThoughtExpansion() {
  await nextTick();
  scrollToBottom();
}

function handleReloadConfirm() {
  if (activeSessionId.value) {
    sessionsStore.reloadSession(activeSessionId.value);
  }
  isReloadModalOpen.value = false;
}

function handleCompressHistory() {
  if (activeSessionId.value) {
    sessionsStore.compressCurrentSession(activeSessionId.value);
  }
}

function handleExport() {
  if (activeSessionId.value) {
    window.open(`/api/sessions/${activeSessionId.value}/export`, '_blank');
  }
}

function handleShowSummary(message: HistorySummaryMessage) {
  selectedSummary.value = message.summary;
  isSummaryModalOpen.value = true;
}

const overlayOffset = computed(() => Math.max(16, inputHeight.value + 16));
// Bottom padding keeps chat content from overlapping the input controls
const bottomPad = computed(() => Math.max(56, inputHeight.value + 8));
// Place the Stop button slightly above the bottom padding to leave extra breathing room below
const stopBtnBottom = computed(() => bottomPad.value + 8);
// Ensure Scroll-to-bottom button never overlaps Stop; default 96px (bottom-24)
const scrollBtnBottom = computed(() => isStreaming.value ? stopBtnBottom.value + 48 : 96);
// Prompt queue helpers
const promptEntries = computed(() => {
  const id = activeSessionId.value;
  if (!id) return [] as Array<{ id: string; status: string; content: string; createdAt: string }>;
  return sessionsStore.promptEntriesBySession(id);
});

const activePrompt = computed(() => {
  const id = activeSessionId.value;
  if (!id) return undefined as { id: string; status: string } | undefined;
  return sessionsStore.activePromptEntry(id);
});

const isStreaming = computed(() => activePrompt.value?.status === 'streaming');

const queuedTail = computed(() => {
  const activeId = activePrompt.value?.id;
  const allowed = new Set(['queued', 'sending', 'submitted', 'failed']);
  return promptEntries.value.filter((entry) => entry.id !== activeId && allowed.has(entry.status));
});

const promptRevision = computed(() => {
  const id = activeSessionId.value;
  if (!id) return 0;
  return sessionsStore.promptRevision(id);
});

watch(promptRevision, async () => {
  await nextTick();
  scrollToBottom(true);
});

function toggleLayout() {
  const newLayout = themeStore.chatLayout === 'bubbled' ? 'aligned' : 'bubbled';
  themeStore.setChatLayout(newLayout);
}

watch(
  () => activeSession.value?.messages,
  async () => {
    await nextTick();
    scrollToBottom();
  },
  { deep: true }
);

watch(
  () => route.params,
  async (params) => {
    const { workspaceId, sessionId } = params;
    if (typeof workspaceId !== 'string' || typeof sessionId !== 'string') return;

    workspacesStore.setActiveWorkspaceId(workspaceId);
    
    await sessionsStore.fetchAndSetActiveSession(sessionId);
    
    if (sessionsStore.justBranchedSessionId === sessionId) {
      toast.success('Branched session created successfully!');
      sessionsStore.justBranchedSessionId = null;
    }

    sessionsStore.listenToSession(sessionId);
    
    await nextTick();
    scrollToBottom();
  },
  { immediate: true, deep: true }
);

function removeQueued(messageId: string) {
  if (!activeSessionId.value) return;
  sessionsStore.removeQueuedByMessageId(activeSessionId.value, messageId);
}

function stopStreaming() {
  if (!activeSessionId.value) return;
  sessionsStore.cancelPrompt(activeSessionId.value);
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
