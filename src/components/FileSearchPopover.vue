<template>
  <transition
    enter-active-class="transition ease-out duration-100"
    enter-from-class="transform opacity-0 scale-95"
    enter-to-class="transform opacity-100 scale-100"
    leave-active-class="transition ease-in duration-75"
    leave-from-class="transform opacity-100 scale-100"
    leave-to-class="transform opacity-0 scale-95"
  >
    <div
      v-if="fileSearch.show"
      class="absolute bottom-full mb-2 w-full rounded-lg border border-surface-divider bg-surface-card shadow-lg z-10"
    >
      <div class="border-b border-surface-divider px-3 py-2">
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Attach a file</h3>
      </div>
      <div class="p-2">
        <ul class="thin-scrollbar max-h-40 sm:max-h-60 overflow-y-auto">
          <li v-if="fileSearch.isLoading" class="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Searching...</li>
          <li v-else-if="fileSearch.results.length === 0 && fileSearch.query" class="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No files found matching "{{ fileSearch.query }}".</li>
          <li v-else-if="fileSearch.results.length === 0" class="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Start typing to search for a file.</li>
          <li
            v-for="(file, index) in fileSearch.results"
            :key="file"
            :ref="el => { if (index === fileSearch.selectedIndex) selectedItem = el as HTMLElement }"
            @click="selectFile(file)"
            class="mr-2 cursor-pointer rounded-md px-3 py-2 text-sm truncate"
            :class="{
              'bg-blue-500 text-white': index === fileSearch.selectedIndex,
              'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700': index !== fileSearch.selectedIndex,
            }"
            :title="file"
            dir="rtl"
          >
            <bdi><span
              dir="ltr"
              :class="{
                'text-white font-semibold': index === fileSearch.selectedIndex,
                'text-slate-800 dark:text-slate-200 font-semibold': index !== fileSearch.selectedIndex,
              }"
            >{{ getFilename(file) }}</span></bdi><span
              dir="ltr"
              :class="{
                'text-blue-200': index === fileSearch.selectedIndex,
                'text-slate-500 dark:text-slate-400': index !== fileSearch.selectedIndex,
              }"
            >{{ getDirectory(file) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useSessionsStore } from '@/stores/sessions';
import { storeToRefs } from 'pinia';
import { ref, watch, nextTick } from 'vue';

const sessionsStore = useSessionsStore();
const { fileSearch } = storeToRefs(sessionsStore);
const selectedItem = ref<HTMLElement | null>(null);

const emit = defineEmits(['select']);

function selectFile(file: string) {
  emit('select', file);
  sessionsStore.hideFileSearch();
}

function getDirectory(path: string): string {
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  if (lastSlash === -1) return '';
  return path.substring(0, lastSlash + 1);
}

function getFilename(path: string): string {
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  if (lastSlash === -1) return path;
  return path.substring(lastSlash + 1);
}

watch(() => fileSearch.value.selectedIndex, async () => {
  await nextTick();
  if (selectedItem.value) {
    selectedItem.value.scrollIntoView({ block: 'nearest' });
  }
});
</script>
