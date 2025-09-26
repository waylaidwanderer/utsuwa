<template>
  <BaseModal :show="show" :title="modalTitle" @close="closeModal">
    <div v-if="isLoading" class="flex items-center justify-center p-8">
      <svg class="animate-spin h-8 w-8 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <div v-else class="space-y-4">
      <p class="text-sm text-slate-600 dark:text-slate-400">{{ modalMessage }}</p>
      
      <div v-if="showDeleteFilesCheckbox" class="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg">
        <label class="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            v-model="shouldDeleteFiles"
            class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          />
          <div class="flex flex-col">
            <span class="font-semibold text-amber-800 dark:text-amber-200">Permanently delete directory and all its contents</span>
            <span class="text-xs text-amber-600 dark:text-amber-400">This action cannot be undone.</span>
          </div>
        </label>
      </div>
    </div>

    <template v-if="!isLoading" #actions>
      <button @click="closeModal" :disabled="isDeleting" class="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50">
        Cancel
      </button>
      <button 
        @click="handleDelete" 
        :disabled="isDeleteButtonDisabled"
        class="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white w-40"
        :class="{
          'bg-red-600 hover:bg-red-700': !isDeleteButtonDisabled,
          'bg-slate-400 dark:bg-slate-600 cursor-not-allowed': isDeleteButtonDisabled
        }"
      >
        <svg v-if="isDeleting" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span v-else>{{ deleteButtonText }}</span>
      </button>
    </template>
</BaseModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Workspace } from '@waylaidwanderer/sumika-types';
import { useWorkspacesStore } from '@/stores/workspaces';
import { workspaceService } from '@/services/WorkspaceService';
import BaseModal from './BaseModal.vue';

const props = defineProps<{
  show: boolean;
  workspace: Workspace | null;
}>();

const emit = defineEmits(['close']);

const workspacesStore = useWorkspacesStore();
const isLoading = ref(false);
const isDeleting = ref(false);
const isDirectoryEmpty = ref(true);
const shouldDeleteFiles = ref(false);

const isManagedWorkspace = computed(() => {
    return props.workspace?.path.includes('.sumika/workspaces');
});

watch(() => props.show, async (newVal) => {
  if (newVal && props.workspace) {
    isLoading.value = true;
    shouldDeleteFiles.value = false; // Reset checkbox
    try {
      const { isEmpty } = await workspaceService.checkWorkspaceEmptiness(props.workspace.id);
      isDirectoryEmpty.value = isEmpty;
    } catch (error) {
      console.error("Failed to check workspace emptiness:", error);
      // Fail safe: assume it's not empty to prevent accidental deletion
      isDirectoryEmpty.value = false;
    } finally {
      isLoading.value = false;
    }
  }
});

const modalTitle = computed(() => {
    if (!props.workspace) return '';
    if (!isDirectoryEmpty.value && isManagedWorkspace.value) {
        return `Delete "${props.workspace.name}" and its files?`;
    }
    return `Delete "${props.workspace.name}"?`;
});

const modalMessage = computed(() => {
    if (!props.workspace) return '';
    if (isManagedWorkspace.value) {
        return `Are you sure you want to delete this workspace? This will remove it from the application and delete all associated session data.`;
    }
    return `This will remove "${props.workspace.name}" from the application and delete its session data. It will NOT delete the directory or files at the custom path: ${props.workspace.path}`;
});

const showDeleteFilesCheckbox = computed(() => {
    return !isDirectoryEmpty.value && isManagedWorkspace.value;
});

const isDeleteButtonDisabled = computed(() => {
    if (isDeleting.value) return true;
    if (showDeleteFilesCheckbox.value && !shouldDeleteFiles.value) return true;
    return false;
});

const deleteButtonText = computed(() => {
    if (showDeleteFilesCheckbox.value) {
        return 'Delete Everything';
    }
    return 'Delete Workspace';
});

async function handleDelete() {
  if (!props.workspace || isDeleteButtonDisabled.value) return;

  isDeleting.value = true;
  try {
    await workspacesStore.deleteWorkspace(props.workspace.id, shouldDeleteFiles.value);
    closeModal();
  } finally {
    isDeleting.value = false;
  }
}

function closeModal() {
  emit('close');
}
</script>
