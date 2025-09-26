<template>
  <button
    @click="createSession"
    :disabled="disabled"
    class="card-muted w-full border border-dashed border-slate-300/70 px-4 py-5 text-center transition-colors duration-150 ease-in-out dark:border-slate-600/70"
    :class="{
      'cursor-pointer hover:border-slate-400 hover:bg-white text-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:text-slate-200': !disabled,
      'cursor-not-allowed text-disabled opacity-80': disabled,
    }"
  >
    <div v-if="disabled" class="flex items-center justify-center font-semibold">
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Loading...
    </div>
    <div v-else class="flex items-center justify-center font-semibold text-slate-600 dark:text-slate-200">
      <svg xmlns="http://www.w3.org/2000/svg" class="mr-2 h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      New Session
    </div>
  </button>
</template>

<script setup lang="ts">
import { useSessionsStore } from '@/stores/sessions';
import { useWorkspacesStore } from '@/stores/workspaces';
import { storeToRefs } from 'pinia';

defineProps<{
  disabled: boolean;
}>();

const sessionsStore = useSessionsStore();
const workspacesStore = useWorkspacesStore();
const { activeWorkspaceId } = storeToRefs(workspacesStore);

async function createSession() {
  if (activeWorkspaceId.value) {
    await sessionsStore.createSession();
  } else {
    console.error("No active workspace to create a session in.");
  }
}
</script>
