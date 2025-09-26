<template>
  <div
    class="group flex items-stretch gap-2 transition-opacity"
    :class="{ 'opacity-60': session.status === 'disconnected' }"
  >
    <!-- EDITING VIEW -->
    <div v-if="isEditing" class="card-muted flex-1 rounded-xl px-4 py-4">
      <div class="flex items-center gap-2">
        <input
          type="text"
          v-model="newName"
          @keydown.enter="handleRename"
          @keydown.esc="cancel"
          class="w-full truncate rounded-lg border border-blue-200 bg-white/90 px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-blue-400/40 dark:bg-slate-800/70 dark:text-slate-100"
          autofocus
        />
        <button @click="handleRename" class="p-2 text-emerald-500 hover:text-emerald-700 cursor-pointer">
          <CheckIcon class="h-5 w-5" />
        </button>
        <button @click="cancel" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
          <XMarkIcon class="h-5 w-5" />
        </button>
      </div>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">{{ getLastMessageSnippet(session) }}</p>
    </div>

    <!-- DEFAULT VIEW -->
    <template v-else>
      <router-link
        :to="{ name: 'session', params: { workspaceId: session.workspaceId, sessionId: session.id } }"
        class="card-muted card-muted--interactive relative block flex-1 min-w-0 rounded-xl px-4 py-4 transition-colors duration-150"
        :class="{
          'card-muted--active indicator-accent': session.pinned,
        }"
      >
        <div class="flex items-center gap-2">
          <span
            v-if="session.status === 'disconnected'"
            class="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-500"
            title="Disconnected"
          ></span>
        <p class="truncate font-semibold tracking-tight text-heading-strong">{{ session.name }}</p>
          <span v-if="session.status === 'reinitializing'" class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-slate-700 dark:text-blue-200">
            Reconnecting
          </span>
        </div>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 truncate">{{ getLastMessageSnippet(session) }}</p>
      </router-link>

      <!-- Action Buttons / Kebab Menu -->
      <div class="flex items-center">
        <!-- DELETE CONFIRMATION -->
        <div v-if="isConfirmingDelete" class="flex items-center p-1">
          <div v-if="session.isUpdating" class="p-2">
            <svg class="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <template v-else>
            <button @click="emit('delete')" class="p-2 text-emerald-500 hover:text-emerald-700 cursor-pointer">
              <CheckIcon class="h-5 w-5" />
            </button>
            <button @click="cancel" class="p-2 text-red-500 hover:text-red-700 cursor-pointer">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </template>
        </div>
        <!-- ACTION MENU -->
        <div v-else-if="isMenuVisible" class="card-muted flex items-center self-stretch rounded-xl p-1">
          <div v-if="session.isUpdating" class="p-2">
            <svg class="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <template v-else>
            <button v-if="session.status === 'disconnected' || session.status === 'reinitializing'"
              @click="emit('reconnect')"
              :disabled="session.status === 'reinitializing'"
              class="p-2 flex items-center text-slate-500 dark:text-slate-400 hover:text-sky-500 cursor-pointer disabled:cursor-wait disabled:text-sky-400"
              title="Reconnect"
            >
              <ArrowPathIcon class="h-5 w-5" :class="{ 'animate-spin': session.status === 'reinitializing' }" />
            </button>
            <button @click="emit('togglePin')" class="p-2 text-slate-500 dark:text-slate-400 hover:text-amber-500 cursor-pointer" :title="session.pinned ? 'Unpin' : 'Pin'">
              <StarIconSolid v-if="session.pinned" class="h-5 w-5 text-amber-400" />
              <StarIconOutline v-else class="h-5 w-5" />
            </button>
            <button @click="startEditing" class="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-500 cursor-pointer" title="Rename">
              <PencilIcon class="h-5 w-5" />
            </button>
            <a :href="`/api/sessions/${session.id}/export`" download class="p-2 text-slate-500 dark:text-slate-400 hover:text-sky-500 cursor-pointer" title="Export">
              <ArrowDownTrayIcon class="h-5 w-5" />
            </a>
            <button @click="startConfirmingDelete" class="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 cursor-pointer" title="Delete">
              <TrashIcon class="h-5 w-5" />
            </button>
            <button @click="cancel" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer" title="Cancel">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </template>
        </div>
        <!-- KEBAB MENU TOGGLE -->
        <button v-else @click="isMenuVisible = true" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
          <EllipsisVerticalIcon class="h-5 w-5" />
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { SessionData } from '@waylaidwanderer/sumika-types';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from '@heroicons/vue/24/solid';
import { StarIcon as StarIconSolid } from '@heroicons/vue/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/vue/24/outline';

const props = defineProps<{
  session: SessionData;
}>();

const emit = defineEmits<{
  (e: 'togglePin'): void;
  (e: 'rename', newName: string): void;
  (e: 'delete'): void;
  (e: 'reconnect'): void;
}>();

const isMenuVisible = ref(false);
const isEditing = ref(false);
const isConfirmingDelete = ref(false);
const newName = ref('');

function startEditing() {
  isEditing.value = true;
  isMenuVisible.value = false;
  newName.value = props.session.name;
}

function startConfirmingDelete() {
  isConfirmingDelete.value = true;
  isMenuVisible.value = false;
}

function handleRename() {
  if (newName.value.trim()) {
    emit('rename', newName.value.trim());
  }
  cancel();
}

function cancel() {
  isEditing.value = false;
  isConfirmingDelete.value = false;
  isMenuVisible.value = false;
  newName.value = '';
}

// A local copy of this function to keep the component self-contained
function getLastMessageSnippet(session: SessionData): string {
  const lastMessage = (session.messages && session.messages.length > 0) 
    ? session.messages[session.messages.length - 1] 
    : session.lastMessage;

  if (!lastMessage) {
    return 'No messages yet.';
  }

  switch (lastMessage.type) {
    case 'user':
      const userText = lastMessage.content.find(c => c.type === 'text')?.text || '';
      return `You: ${userText.substring(0, 100)}...`;
    case 'agent':
      return `Agent: ${lastMessage.content.substring(0, 100)}...`;
    case 'tool_call':
      return lastMessage.status === 'awaiting_permission'
        ? `Awaiting permission for: ${lastMessage.title}`
        : `Tool Call: ${lastMessage.title}`;
    case 'thought':
        return 'Agent is thinking...';
    case 'error':
      return 'Agent encountered an error.';
    default:
      return 'No messages yet.';
  }
}
</script>
