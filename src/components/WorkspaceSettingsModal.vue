<template>
  <BaseModal :show="show" title="Workspace Settings" @close="$emit('close')">
    <div class="space-y-4">
      <div>
        <label for="workspaceName" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
        <input
          type="text"
          id="workspaceName"
          v-model="editableWorkspace.name"
          class="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div>
        <label for="workspaceDescription" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
        <textarea
          id="workspaceDescription"
          v-model="editableWorkspace.description"
          rows="3"
          class="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        ></textarea>
      </div>
       <div>
        <label for="workspacePath" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Directory Path</label>
        <input
          type="text"
          id="workspacePath"
          :value="editableWorkspace.path"
          disabled
          class="mt-1 block w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-500 dark:text-slate-400 sm:text-sm cursor-not-allowed"
        />
      </div>

      <div v-if="SHOW_WORKSPACE_ENV" class="border-t border-slate-200 dark:border-slate-700 pt-4">
        <h3 class="text-md font-semibold text-slate-800 dark:text-slate-200">Environment Variables</h3>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Variables defined here will override any global environment variables.
        </p>
        <div class="mt-3 space-y-2">
          <div v-for="(item, index) in envVars" :key="index" class="flex items-center gap-2">
              <input
                type="text"
                v-model="item.key"
                placeholder="KEY"
                class="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <input
                type="text"
                v-model="item.value"
                placeholder="VALUE"
                class="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <button @click="removeEnvVar(index)" class="p-2 text-red-500 hover:text-red-700 flex-shrink-0">
                <TrashIcon class="h-5 w-5" />
              </button>
            </div>
          </div>
          <button @click="addEnvVar" class="mt-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
            + Add Variable
          </button>
      </div>

      <!-- Danger Zone -->
      <div class="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-bold text-red-800 dark:text-red-200">Delete Workspace</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">This action is permanent and cannot be undone.</p>
          </div>
          <button @click="handleDeleteClick" class="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-200 text-slate-700 hover:bg-red-100 hover:text-red-700 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-red-900/50 dark:hover:text-red-200">
            Delete...
          </button>
        </div>
      </div>
    </div>
    <template #actions>
      <button @click="$emit('close')" :disabled="isSaving" class="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50">
        Cancel
      </button>
      <button @click="handleSave" :disabled="isSaving" class="flex w-32 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-600">
        <svg v-if="isSaving" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span v-else>Save Changes</span>
      </button>
    </template>
</BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Workspace } from '@waylaidwanderer/sumika-types';
import { useWorkspacesStore } from '@/stores/workspaces';
import BaseModal from './BaseModal.vue';
import { TrashIcon } from '@heroicons/vue/24/solid';

const props = defineProps<{
  show: boolean;
  workspace: Workspace | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open-delete-modal'): void;
}>();

const workspacesStore = useWorkspacesStore();
const isSaving = ref(false);
const editableWorkspace = ref<Partial<Workspace>>({});
// Feature flag: workspace-level env vars UI
// TODO: Set to true when workspace-level env vars are supported end-to-end.
const SHOW_WORKSPACE_ENV = false;
const envVars = ref<{ key: string; value: string }[]>([]);

watch(() => props.workspace, (newWorkspace) => {
  if (newWorkspace) {
    editableWorkspace.value = { ...newWorkspace };
    if (SHOW_WORKSPACE_ENV) {
      envVars.value = Object.entries(newWorkspace.env || {}).map(([key, value]) => ({ key, value }));
    } else {
      envVars.value = [];
    }
  } else {
    editableWorkspace.value = {};
    envVars.value = [];
  }
}, { immediate: true });

function addEnvVar() {
  envVars.value.push({ key: '', value: '' });
}

function removeEnvVar(index: number) {
  envVars.value.splice(index, 1);
}

function handleDeleteClick() {
  emit('close');
  emit('open-delete-modal');
}

async function handleSave() {
  if (!props.workspace || isSaving.value) return;

  isSaving.value = true;
  try {
    const updates: Partial<Workspace> = {
      name: editableWorkspace.value.name,
      description: editableWorkspace.value.description,
    };
    if (SHOW_WORKSPACE_ENV) {
      const updatedEnv = envVars.value
        .filter(item => item.key.trim() !== '')
        .reduce((acc, item) => {
          acc[item.key.trim()] = item.value;
          return acc;
        }, {} as Record<string, string>);
      updates.env = updatedEnv;
    }
    
    await workspacesStore.updateWorkspace(props.workspace.id, updates);
    emit('close');
  } finally {
    isSaving.value = false;
  }
}
</script>
