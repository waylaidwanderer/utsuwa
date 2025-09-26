<template>
  <BaseModal :show="show" title="Upload a File" @close="handleClose">
    <div
      class="relative rounded-lg border-2 border-dashed border-slate-300 p-8 text-center transition-colors duration-300 dark:border-slate-600"
      :class="{ 'bg-blue-50 dark:bg-slate-700/40 border-blue-400': isDragOver }"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        @change="handleFileSelect"
      />

      <!-- Idle / Default State -->
      <div v-if="!selectedFile && !isUploading" class="space-y-2">
        <div class="flex justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p class="text-slate-500 dark:text-slate-400">
          <button
            type="button"
            class="font-semibold text-blue-600 hover:underline focus:outline-none dark:text-blue-300"
            @click="triggerFileInput"
          >
            Click to upload
          </button>
          or drag and drop a file here.
        </p>
        <p class="text-xs text-slate-400 dark:text-slate-500">Max file size: 100MB</p>
      </div>

      <!-- Error State -->
      <div v-else-if="errorMessage" class="space-y-4">
        <div class="flex flex-col items-center justify-center gap-2">
            <p class="font-semibold text-red-700 dark:text-red-300">Upload Failed</p>
            <p class="text-sm text-red-500 dark:text-red-400">{{ errorMessage }}</p>
        </div>
        <button @click="clearSelection" class="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
          Try Again
        </button>
      </div>

      <!-- Uploading State -->
      <div v-else class="space-y-4">
         <div class="flex items-center justify-center gap-3">
          <svg class="h-8 w-8 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-lg font-semibold text-slate-700 dark:text-slate-300">Processing...</p>
        </div>
        <p class="text-slate-500 dark:text-slate-400">{{ selectedFile?.name }}</p>
      </div>
    </div>

    <template #actions>
        <button @click="handleClose" :disabled="isUploading" class="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 disabled:opacity-50">
          Close
        </button>
    </template>

    <FileOverwriteModal
      :show="isOverwriteModalVisible"
      :filename="selectedFile?.name || ''"
      @close="handleOverwriteClose"
      @confirm="confirmOverwrite"
    />
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useWorkspacesStore } from '@/stores/workspaces';
import { storeToRefs } from 'pinia';
import { workspaceService } from '@/services/WorkspaceService';
import { useToast } from 'vue-toastification';
import FileOverwriteModal from './FileOverwriteModal.vue';
import BaseModal from './BaseModal.vue';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits(['close']);

const workspacesStore = useWorkspacesStore();
const { activeWorkspaceId } = storeToRefs(workspacesStore);
const toast = useToast();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const isDragOver = ref(false);
const isUploading = ref(false);
const errorMessage = ref<string | null>(null);
const isOverwriteModalVisible = ref(false);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

watch(() => props.show, (newVal) => {
  if (!newVal) {
    clearSelection();
  }
});

function handleClose() {
    if (!isUploading.value) {
        emit('close');
    }
}

function triggerFileInput() {
  fileInput.value?.click();
}

function handleDragOver() {
  isDragOver.value = true;
}

function handleDragLeave() {
  isDragOver.value = false;
}

function handleDrop(event: DragEvent) {
  isDragOver.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processFile(target.files[0]);
  }
}

async function processFile(file: File) {
  selectedFile.value = file;
  errorMessage.value = null;

  if (file.size > MAX_FILE_SIZE) {
    errorMessage.value = `File is too large. Maximum size is 20MB.`;
    return;
  }

  await handleUpload();
}

function clearSelection() {
  selectedFile.value = null;
  errorMessage.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

async function performUpload(overwrite: boolean) {
  if (!selectedFile.value || !activeWorkspaceId.value) return;

  isUploading.value = true;
  try {
    const result = await workspaceService.uploadFile(activeWorkspaceId.value, selectedFile.value, overwrite);
    toast.success(`Successfully uploaded "${result.filename}"`);
    emit('close');
  } catch (error) {
    workspacesStore._handleError(error, `upload file "${selectedFile.value.name}"`);
  } finally {
    isUploading.value = false;
    // Don't clear selection on error, so user can see what failed
    if (!errorMessage.value) {
        clearSelection();
    }
  }
}

async function handleUpload() {
  if (!selectedFile.value || errorMessage.value || !activeWorkspaceId.value) return;

  isUploading.value = true; // Set uploading state immediately
  try {
    const { exists } = await workspaceService.checkFileExists(activeWorkspaceId.value, selectedFile.value.name);
    if (exists) {
      isOverwriteModalVisible.value = true;
      // Note: we don't set isUploading to false here, the modal is an overlay on the uploading state
    } else {
      await performUpload(false);
    }
  } catch (error) {
    workspacesStore._handleError(error, 'check if file exists');
    isUploading.value = false;
  }
}

function handleOverwriteClose() {
    isOverwriteModalVisible.value = false;
    isUploading.value = false;
    clearSelection();
}

async function confirmOverwrite() {
  isOverwriteModalVisible.value = false;
  await performUpload(true);
}
</script>
