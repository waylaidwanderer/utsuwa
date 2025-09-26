<template>
  <BaseModal :show="show" title="Global Settings" @close="$emit('close')">
    <div v-if="isLoading" class="flex items-center justify-center p-8">
      <svg class="animate-spin h-8 w-8 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    <div v-else class="space-y-6">
      <section>
        <h3 class="text-md font-semibold text-slate-800 dark:text-slate-200">Environment Variables</h3>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          These variables are applied to the agent process. Changes take effect after a server restart (for now).
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
      </section>

      <section>
        <h3 class="text-md font-semibold text-slate-800 dark:text-slate-200">Custom ACP Command</h3>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Optionally, provide a shell command to launch a custom ACP-compliant agent. If blank, the default Gemini CLI will be used.
        </p>
        <div class="mt-3">
          <input
            type="text"
            v-model="customAcpCommand"
            placeholder="/path/to/your/agent --acp"
            class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </section>

      <div class="border-t border-slate-200 dark:border-slate-700 pt-4">
        <p class="text-sm text-slate-600 dark:text-slate-400">
          <span class="font-semibold">Note:</span> Clicking "Save" will apply your settings and restart the agent process. Any active sessions will be disconnected and will need to be reloaded.
        </p>
      </div>
    </div>

    <template #actions>
      <button @click="$emit('close')" :disabled="isSaving" class="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50">
        Close
      </button>
      <button @click="handleSave" :disabled="isSaving || isLoading" class="flex w-32 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-600">
        <svg v-if="isSaving" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 " >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span v-else>Save</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Settings } from '@waylaidwanderer/sumika-types';
import { settingsService } from '@/services/SettingsService';
import BaseModal from './BaseModal.vue';
import { TrashIcon } from '@heroicons/vue/24/solid';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const isSaving = ref(false);
const isLoading = ref(false);
const envVars = ref<{ key: string; value: string }[]>([]);
const customAcpCommand = ref('');

async function loadSettings() {
  isLoading.value = true;
  try {
    const s = await settingsService.getSettings();
    const env = s.env ?? {};
    envVars.value = Object.entries(env).map(([key, value]) => ({ key, value: String(value) }));
    customAcpCommand.value = s.customAcpCommand ?? '';
  } catch {
    // Best-effort; show empty editor on failure
    envVars.value = [];
    customAcpCommand.value = '';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  if (props.show) loadSettings();
});

watch(() => props.show, (val) => { if (val) loadSettings(); });

function addEnvVar() {
  envVars.value.push({ key: '', value: '' });
}
function removeEnvVar(index: number) {
  envVars.value.splice(index, 1);
}

async function handleSave() {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    const updatedEnv = envVars.value
      .filter(item => item.key.trim() !== '')
      .reduce((acc, item) => {
        acc[item.key.trim()] = item.value;
        return acc;
      }, {} as Record<string, string>);
    const current = await settingsService.getSettings();
    const payload: Settings = { 
      ...current, 
      env: updatedEnv,
      customAcpCommand: customAcpCommand.value.trim() || undefined,
    };
    await settingsService.updateSettings(payload);
    await settingsService.restartAgent();
    emit('close');
  } finally {
    isSaving.value = false;
  }
}
</script>
