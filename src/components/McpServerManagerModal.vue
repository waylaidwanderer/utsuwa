<template>
  <BaseModal :show="show" :title="modalTitle" @close="handleClose">
    <div class="space-y-6">
      <!-- Server List -->
      <div>
        <div v-if="localServers.length > 0" class="space-y-2">
          <div v-for="server in localServers" :key="server.name" class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-between">
            <div>
              <p class="font-semibold text-slate-800 dark:text-slate-200">{{ server.name }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-mono">{{ server.server.command }} {{ server.server.args.join(' ') }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button @click="startEditing(server)" :disabled="isBusy" class="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                <PencilIcon class="h-5 w-5" />
              </button>
              <button @click="handleDelete(server.name)" :disabled="isBusy" class="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <TrashIcon class="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8 px-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p class="font-semibold text-slate-700 dark:text-slate-300">No MCP Servers Configured</p>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Add a server to make tools available to the agent.</p>
        </div>
      </div>

      <!-- Add/Edit Form -->
      <div class="border-t border-slate-200 dark:border-slate-700 pt-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200">{{ isEditing ? 'Edit Server' : 'Add New Server' }}</h3>
          <div class="flex justify-end gap-2">
              <button v-if="isEditing" @click="clearForm" :disabled="isBusy" class="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 disabled:opacity-50">Cancel Edit</button>
              <button @click="addOrUpdateServer" :disabled="!editableServer.name || !editableServer.command || isBusy" class="flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-600">
                <svg v-if="isBusy" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span v-else>Save</span>
              </button>
          </div>
        </div>
        <p v-if="isGlobalScope" class="text-xs text-slate-500 dark:text-slate-400 mb-2">Global servers are stored in <code>~/.sumika/settings.json</code>. Workspace servers with the same name will override these.</p>
        <div class="space-y-4" :class="{ 'opacity-50': isBusy }">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Server Name</label>
            <input type="text" v-model="editableServer.name" :disabled="isEditing || isBusy" placeholder="mcpServerName" class="input-field" :class="{ 'cursor-not-allowed': isEditing }" />
            <p v-if="isEditing" class="text-xs text-slate-400 mt-1">Server name cannot be changed after creation.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Command</label>
            <input type="text" v-model="editableServer.command" :disabled="isBusy" placeholder="npx" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Arguments (space-separated)</label>
            <input type="text" v-model="editableServer.args" :disabled="isBusy" placeholder="mcp-server-name" class="input-field" />
          </div>
          <div>
            <h4 class="text-sm font-medium text-slate-700 dark:text-slate-300">Environment Variables</h4>
            <div class="mt-2 space-y-2">
              <div v-for="(item, index) in editableServer.env" :key="index" class="flex items-center gap-2">
                <input type="text" v-model="item.key" :disabled="isBusy" placeholder="KEY" class="input-field" />
                <input type="text" v-model="item.value" :disabled="isBusy" placeholder="VALUE" class="input-field" />
                <button @click="removeEnvVar(index)" :disabled="isBusy" class="p-2 text-red-500 hover:text-red-700 flex-shrink-0">
                  <TrashIcon class="h-5 w-5" />
                </button>
              </div>
            </div>
            <button @click="addEnvVar" :disabled="isBusy" class="mt-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
              + Add Variable
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #actions>
      <button @click="handleClose" class="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
        Close
      </button>
    </template>
  </BaseModal>
 </template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Workspace, McpServer, Settings } from '@waylaidwanderer/sumika-types';
import { useWorkspacesStore } from '@/stores/workspaces';
import { useToast } from 'vue-toastification';
import BaseModal from './BaseModal.vue';
import { TrashIcon, PencilIcon } from '@heroicons/vue/24/solid';
import { cloneDeep } from 'lodash-es';
import { settingsService } from '@/services/SettingsService';

const props = defineProps<{
  show: boolean;
  workspace?: Workspace | null;
  scope: 'workspace' | 'global';
}>();

const emit = defineEmits(['close']);

type EditableServer = {
  name: string;
  command: string;
  args: string;
  env: { key: string; value: string }[];
};

const workspacesStore = useWorkspacesStore();
const toast = useToast();
const isBusy = ref(false);
const localServers = ref<{name: string, server: McpServer}[]>([]);
const isEditing = ref(false);
const settings = ref<Settings>({ env: {}, mcpServers: {} });

const newEditableServer = (): EditableServer => ({
  name: '',
  command: '',
  args: '',
  env: [],
});
const editableServer = ref<EditableServer>(newEditableServer());

const isGlobalScope = computed(() => props.scope === 'global');
const modalTitle = computed(() => (isGlobalScope.value ? 'Global MCP Servers' : 'Workspace MCP Servers'));

async function loadServersFromSource() {
  if (isGlobalScope.value) {
    const data = await settingsService.getSettings();
    settings.value = data;
    localServers.value = Object.entries(cloneDeep(data.mcpServers || {})).map(([name, server]) => ({ name, server }));
  } else {
    const ws = props.workspace;
    if (ws && ws.mcpServers) {
      localServers.value = Object.entries(cloneDeep(ws.mcpServers)).map(([name, server]) => ({ name, server }));
    } else {
      localServers.value = [];
    }
  }
  if (!isBusy.value) clearForm();
}

watch(() => props.workspace, async () => {
  if (!isGlobalScope.value) await loadServersFromSource();
}, { deep: true });

watch(() => props.show, async (show) => {
  if (show) await loadServersFromSource();
});

function startEditing(server: {name: string, server: McpServer}) {
  if (isBusy.value) return;
  isEditing.value = true;
  editableServer.value = {
    name: server.name,
    command: server.server.command,
    args: server.server.args.join(' '),
    env: Object.entries(server.server.env).map(([key, value]) => ({ key, value })),
  };
}

async function handleDelete(serverName: string) {
  if (isBusy.value) return;

  isBusy.value = true;
  try {
    if (isGlobalScope.value) {
      const updated = { ...settings.value.mcpServers };
      delete updated[serverName];
      const next = await settingsService.updateSettings({
        env: settings.value.env ?? {},
        mcpServers: updated,
      });
      settings.value = next;
      localServers.value = Object.entries(cloneDeep(next.mcpServers || {})).map(([name, server]) => ({ name, server }));
    } else if (props.workspace) {
      const updatedServers = { ...props.workspace.mcpServers };
      delete updatedServers[serverName];
      await workspacesStore.updateWorkspace(props.workspace.id, { mcpServers: updatedServers });
      localServers.value = Object.entries(cloneDeep(updatedServers)).map(([name, server]) => ({ name, server }));
    }
    toast.success(`Server "${serverName}" deleted.`);
    if (editableServer.value.name === serverName) clearForm();
  } catch (error) {
    if (!isGlobalScope.value) {
      workspacesStore._handleError(error, `delete server "${serverName}"`);
    } else {
      console.error(error);
    }
  } finally {
    isBusy.value = false;
  }
}

function addEnvVar() {
  editableServer.value.env.push({ key: '', value: '' });
}

function removeEnvVar(index: number) {
  editableServer.value.env.splice(index, 1);
}

function clearForm() {
    isEditing.value = false;
    editableServer.value = newEditableServer();
}

async function addOrUpdateServer() {
  if (isBusy.value) return;
  const serverName = editableServer.value.name.trim();
  if (!serverName) return;

  isBusy.value = true;
  try {
    const newServerConfig: McpServer = {
      command: editableServer.value.command.trim(),
      args: editableServer.value.args.trim().split(' ').filter(Boolean),
      env: editableServer.value.env
        .filter(item => item.key.trim() !== '')
        .reduce((acc, item) => {
          acc[item.key.trim()] = item.value;
          return acc;
        }, {} as Record<string, string>),
    };

    if (isGlobalScope.value) {
      const updated = { ...settings.value.mcpServers, [serverName]: newServerConfig };
      const next = await settingsService.updateSettings({
        env: settings.value.env ?? {},
        mcpServers: updated,
      });
      settings.value = next;
      localServers.value = Object.entries(cloneDeep(next.mcpServers || {})).map(([name, server]) => ({ name, server }));
    } else if (props.workspace) {
      const updatedServers = { ...props.workspace.mcpServers, [serverName]: newServerConfig };
      await workspacesStore.updateWorkspace(props.workspace.id, { mcpServers: updatedServers });
      localServers.value = Object.entries(cloneDeep(updatedServers)).map(([name, server]) => ({ name, server }));
    }

    toast.success(`Server "${serverName}" ${isEditing.value ? 'updated' : 'added'}.`);
    clearForm();
  } catch (error) {
    if (!isGlobalScope.value) {
      workspacesStore._handleError(error, `${isEditing.value ? 'update' : 'add'} server "${serverName}"`);
    } else {
      console.error(error);
    }
  } finally {
    isBusy.value = false;
  }
}

function handleClose() {
    if (!isBusy.value) {
        emit('close');
    }
}
</script>

<style scoped>
@reference "tailwindcss";

.input-field {
  @apply block w-full flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm;
}
</style>
