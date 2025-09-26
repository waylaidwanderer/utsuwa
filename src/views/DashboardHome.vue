<template>
  <div class="thin-scrollbar h-full overflow-y-auto p-6">
    <header class="mb-6 flex items-center justify-between border-b border-slate-200/60 pb-4 dark:border-slate-700/50">
      <div class="flex items-center min-h-12">
        <UtsuwaLogo />
      </div>
      <div class="flex items-center gap-2">
        <button @click="isGlobalSettingsOpen = true" class="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700" title="Global Settings">
          <Cog6ToothIcon class="h-5 w-5" />
        </button>
        <button @click="isGlobalMcpModalOpen = true" class="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700" title="Global MCP Servers">
          <CircleStackIcon class="h-5 w-5" />
        </button>
        <ThemeToggle />
      </div>
    </header>

    <!-- Main Content Area -->
    <div class="space-y-4">
      <NewWorkspaceCard :disabled="status === 'loading'" @click="isModalOpen = true" />

      <div v-if="status === 'initializing' || status === 'loading'">
        <WorkspaceListSkeleton />
      </div>
      <div v-else-if="totalWorkspacesCount > 0" class="space-y-3">
        <!-- Pinned Workspaces -->
        <div v-if="pinnedWorkspaces.length > 0">
          <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-caption-muted">Pinned Workspaces</h2>
          <div class="space-y-3">
            <WorkspaceListItem
              v-for="workspace in pinnedWorkspaces"
              :key="workspace.id"
              :workspace="workspace"
              :is-active="workspace.id === activeWorkspaceId"
              @update="(updates) => workspacesStore.updateWorkspace(workspace.id, updates)"
              @open-settings="handleOpenSettings(workspace)"
              @open-delete-modal="handleOpenDeleteModal(workspace)"
              @open-mcp-modal="handleOpenMcpModal(workspace)"
            />
          </div>
        </div>

        <!-- Other Workspaces -->
        <div :class="{ 'mt-6': pinnedWorkspaces.length > 0 }">
          <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-caption-muted">Other Workspaces</h2>
          <div class="space-y-3">
            <WorkspaceListItem
              v-for="workspace in otherWorkspaces"
              :key="workspace.id"
              :workspace="workspace"
              :is-active="workspace.id === activeWorkspaceId"
              @update="(updates) => workspacesStore.updateWorkspace(workspace.id, updates)"
              @open-settings="handleOpenSettings(workspace)"
              @open-delete-modal="handleOpenDeleteModal(workspace)"
              @open-mcp-modal="handleOpenMcpModal(workspace)"
            />
          </div>
        </div>
      </div>
      <EmptyState v-else title="No workspaces yet" message="Create a new workspace to get started." />
    </div>

    <!-- New Workspace Modal -->
    <BaseModal :show="isModalOpen" title="Create New Workspace" @close="isModalOpen = false">
      <div class="space-y-4">
        <div>
          <label for="workspaceName" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
          <input
            type="text"
            id="workspaceName"
            v-model="newWorkspaceName"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="My Awesome Project"
          />
        </div>
        <div>
          <label for="workspaceDescription" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Description (Optional)</label>
          <textarea
            id="workspaceDescription"
            v-model="newWorkspaceDescription"
            rows="3"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="A brief description of what this workspace is for."
          ></textarea>
        </div>
        <div>
          <label for="workspacePath" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Directory Path (Optional)</label>
          <input
            type="text"
            id="workspacePath"
            v-model="newWorkspacePath"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="/home/user/path/to/project"
            autocorrect="off"
            autocapitalize="none"
          />
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            If you provide a path, it must be an absolute path to an existing directory.
          </p>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="creationError" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-200 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span>{{ creationError }}</span>
      </div>

      <template #actions>
        <button @click="isModalOpen = false" :disabled="isCreating" class="px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50">
          Cancel
        </button>
        <button @click="handleCreateWorkspace" :disabled="!newWorkspaceName || isCreating" class="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 w-24 disabled:cursor-not-allowed">
          <svg v-if="isCreating" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span v-else>Create</span>
        </button>
      </template>
</BaseModal>

    <WorkspaceSettingsModal
      :show="isSettingsModalOpen"
      :workspace="editingWorkspace"
      @close="isSettingsModalOpen = false"
      @open-delete-modal="handleOpenDeleteModal(editingWorkspace!)"
    />

    <WorkspaceDeleteModal
      :show="isDeleteModalOpen"
      :workspace="workspaceToDelete"
      @close="isDeleteModalOpen = false"
    />

    <McpServerManagerModal
      scope="workspace"
      :show="isMcpModalOpen"
      :workspace="mcpWorkspace"
      @close="isMcpModalOpen = false"
    />

    <McpServerManagerModal
      scope="global"
      :show="isGlobalMcpModalOpen"
      @close="isGlobalMcpModalOpen = false"
    />

    <GlobalSettingsModal
      :show="isGlobalSettingsOpen"
      @close="isGlobalSettingsOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useWorkspacesStore } from '@/stores/workspaces';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import type { Workspace } from '@waylaidwanderer/sumika-types';
import ThemeToggle from '@/components/ThemeToggle.vue';
import WorkspaceListItem from '@/components/WorkspaceListItem.vue';
import NewWorkspaceCard from '@/components/NewWorkspaceCard.vue';
import WorkspaceListSkeleton from '@/components/WorkspaceListSkeleton.vue';
import EmptyState from '@/components/EmptyState.vue';
import BaseModal from '@/components/BaseModal.vue';
import WorkspaceSettingsModal from '@/components/WorkspaceSettingsModal.vue';
import WorkspaceDeleteModal from '@/components/WorkspaceDeleteModal.vue';
import McpServerManagerModal from '@/components/McpServerManagerModal.vue';
import { CircleStackIcon, Cog6ToothIcon } from '@heroicons/vue/24/solid';
import GlobalSettingsModal from '@/components/GlobalSettingsModal.vue';
import UtsuwaLogo from '@/components/UtsuwaLogo.vue';

const workspacesStore = useWorkspacesStore();
const { workspaces, status, activeWorkspaceId } = storeToRefs(workspacesStore);

const isModalOpen = ref(false);
const isSettingsModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isMcpModalOpen = ref(false);
const isGlobalMcpModalOpen = ref(false);
const isGlobalSettingsOpen = ref(false);
const workspaceToDelete = ref<Workspace | null>(null);
const editingWorkspace = ref<Workspace | null>(null);
const mcpWorkspace = ref<Workspace | null>(null);
const newWorkspaceName = ref('');
const newWorkspaceDescription = ref('');
const newWorkspacePath = ref('');
const isCreating = ref(false);
const creationError = ref<string | null>(null);

const workspacesArray = computed(() => Object.values(workspaces.value).sort((a, b) => a.name.localeCompare(b.name)));
const totalWorkspacesCount = computed(() => workspacesArray.value.length);

const pinnedWorkspaces = computed(() => workspacesArray.value.filter(w => w.pinned));
const otherWorkspaces = computed(() => workspacesArray.value.filter(w => !w.pinned));

async function handleCreateWorkspace() {
  if (!newWorkspaceName.value.trim() || isCreating.value) return;

  creationError.value = null;
  isCreating.value = true;

  try {
    await workspacesStore.createWorkspace(
      newWorkspaceName.value.trim(),
      newWorkspaceDescription.value.trim(),
      newWorkspacePath.value.trim()
    );
    
    isModalOpen.value = false;
    newWorkspaceName.value = '';
    newWorkspaceDescription.value = '';
    newWorkspacePath.value = '';
  } catch (error: unknown) {
    // Attempt to parse the JSON body from the error message
    try {
      const errorMessage = (error as Error).message;
      const bodyMatch = errorMessage.match(/body: (.*)/);
      if (bodyMatch && bodyMatch[1]) {
        const errorBody = JSON.parse(bodyMatch[1]);
        creationError.value = errorBody.error || 'An unexpected error occurred.';
      } else {
        creationError.value = errorMessage || 'An unexpected error occurred.';
      }
    } catch {
      creationError.value = (error as Error).message || 'An unexpected error occurred.';
    }
  } finally {
    isCreating.value = false;
  }
}

function handleOpenSettings(workspace: Workspace) {
  editingWorkspace.value = workspace;
  isSettingsModalOpen.value = true;
}

function handleOpenDeleteModal(workspace: Workspace) {
  workspaceToDelete.value = workspace;
  isDeleteModalOpen.value = true;
}

function handleOpenMcpModal(workspace: Workspace) {
  mcpWorkspace.value = workspace;
  isMcpModalOpen.value = true;
}
</script>
