<template>
  <div class="group flex items-stretch gap-2">
    <!-- DEFAULT VIEW -->
    <router-link
      :to="`/workspaces/${workspace.id}`"
      class="card-muted card-muted--interactive relative block flex-1 overflow-hidden rounded-xl px-4 py-4 transition-colors duration-150"
      :class="{
        'card-muted--active indicator-accent': isActive,
      }"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="truncate font-semibold tracking-tight text-heading-strong">{{ workspace.name }}</p>
        <span
          v-if="workspace.pinned"
          class="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
        >
          Pinned
        </span>
      </div>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 truncate">{{ workspace.description || 'No description' }}</p>
      <p class="mt-2 text-xs text-meta">Created {{ new Date(workspace.createdAt).toLocaleDateString() }}</p>
    </router-link>

    <!-- Action Buttons -->
    <div class="flex items-center">
      <div v-if="isMenuVisible" class="card-muted flex items-center self-stretch rounded-xl p-1">
        <button @click="emit('update', { pinned: !workspace.pinned })" class="p-2 text-slate-500 dark:text-slate-400 hover:text-amber-500" :title="workspace.pinned ? 'Unpin' : 'Pin'">
          <StarIconSolid v-if="workspace.pinned" class="h-5 w-5 text-amber-400" />
          <StarIconOutline v-else class="h-5 w-5" />
        </button>
        <button @click="emit('open-settings')" class="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-500" title="Settings">
          <Cog6ToothIcon class="h-5 w-5" />
        </button>
        <button @click="emit('open-mcp-modal')" class="p-2 text-slate-500 dark:text-slate-400 hover:text-sky-500" title="Manage Tool Servers">
          <CircleStackIcon class="h-5 w-5" />
        </button>
        <button @click="emit('open-delete-modal')" class="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500" title="Delete">
          <TrashIcon class="h-5 w-5" />
        </button>
        <button @click="cancel" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Cancel">
          <XMarkIcon class="h-5 w-5" />
        </button>
      </div>
      <button v-else @click="isMenuVisible = true" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
        <EllipsisVerticalIcon class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import type { Workspace } from '@waylaidwanderer/sumika-types';
import {
  EllipsisVerticalIcon,
  TrashIcon,
  XMarkIcon,
  Cog6ToothIcon,
  CircleStackIcon,
} from '@heroicons/vue/24/solid';
import { StarIcon as StarIconSolid } from '@heroicons/vue/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/vue/24/outline';

defineProps<{
  workspace: Workspace;
  isActive: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', updates: Partial<Workspace>): void;
  (e: 'open-settings'): void;
  (e: 'open-delete-modal'): void;
  (e: 'open-mcp-modal'): void;
}>();

const isMenuVisible = ref(false);

function cancel() {
  isMenuVisible.value = false;
}
</script>
