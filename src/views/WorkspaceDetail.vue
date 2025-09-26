<template>
  <div class="thin-scrollbar h-full overflow-y-auto px-4 py-6 sm:px-6">
    <header class="mb-6 border-b border-slate-200/60 pb-4 dark:border-slate-700/50">
      <!-- Mobile layout -->
      <div class="flex flex-col gap-4 md:hidden">
        <div class="flex items-center justify-between">
          <UtsuwaLogo />
          <ThemeToggle />
        </div>
        <div class="flex w-full items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-xl font-semibold tracking-tight text-heading-strong">
              <span>{{ activeWorkspace?.name || '...' }}</span>
            </h1>
            <p class="truncate text-sm text-slate-500 dark:text-slate-400">{{ activeWorkspace?.description }}</p>
          </div>
          <div class="flex flex-shrink-0 items-center gap-2">
            <button @click="isSettingsModalOpen = true" class="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700" title="Workspace Settings">
              <Cog6ToothIcon class="h-5 w-5" />
            </button>
            <button @click="isMcpModalOpen = true" class="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700" title="Manage Tool Servers">
              <CircleStackIcon class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Desktop layout -->
      <div class="hidden items-center justify-between md:flex">
        <div class="flex items-center gap-4">
          <UtsuwaLogo />
          <div class="self-stretch w-px bg-slate-200 dark:bg-slate-700"></div>
          <div class="flex flex-col justify-center min-h-12">
            <h2 class="text-xl font-semibold tracking-tight text-heading-strong">{{ activeWorkspace?.name || '...' }}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ activeWorkspace?.description }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button @click="isSettingsModalOpen = true" class="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700" title="Workspace Settings">
            <Cog6ToothIcon class="h-5 w-5" />
          </button>
          <button @click="isMcpModalOpen = true" class="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700" title="Manage Tool Servers">
            <CircleStackIcon class="h-5 w-5" />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- At a Glance Status Cards -->
    <div class="mb-8 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4">
      <div class="grid grid-cols-2 gap-2 sm:col-span-2 sm:gap-4">
        <div class="card-muted rounded-xl px-3 py-2 sm:px-4 sm:py-3">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-caption-muted">Active Sessions</h2>
          <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl lg:text-2xl">{{ activeSessionsCount }}</p>
        </div>
        <div class="card-muted rounded-xl px-3 py-2 sm:px-4 sm:py-3">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-caption-muted">Awaiting Input</h2>
          <p class="mt-1 text-lg font-semibold text-emerald-500 sm:text-xl lg:text-2xl">{{ awaitingInputCount }}</p>
        </div>
      </div>
      <div class="grid grid-cols-1">
        <div class="card-muted rounded-xl px-3 py-2 sm:px-4 sm:py-3">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-caption-muted">Total Sessions</h2>
          <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl lg:text-2xl">{{ totalSessionsCount }}</p>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="space-y-4">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
        <div class="flex-1">
          <NewSessionCard :disabled="status !== 'idle'" />
        </div>
        <div class="sm:w-60 sm:flex-shrink-0">
          <ActionStub @click="isUploadModalOpen = true" />
        </div>
      </div>


      <div v-if="status === 'loading'">
        <SessionListSkeleton />
      </div>
      <div v-else-if="totalSessionsCount > 0" class="space-y-3">
        <!-- Pinned Sessions -->
        <div v-if="pinnedSessions.length > 0">
          <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-caption-muted">Pinned Sessions</h2>
          <div class="space-y-3">
            <SessionListItem
              v-for="session in pinnedSessions"
              :key="session.id"
              :session="session"
              @toggle-pin="sessionsStore.togglePin(session.id)"
              @rename="(newName) => sessionsStore.renameSession(session.id, newName)"
              @delete="sessionsStore.deleteSession(session.id)"
              @reconnect="sessionsStore.reconnectSession(session.id)"
            />
          </div>
        </div>

        <!-- Recent Sessions List -->
        <div :class="{ 'mt-6': pinnedSessions.length > 0 }">
          <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-caption-muted">Recent Sessions</h2>
          <div class="space-y-3">
            <SessionListItem
              v-for="session in recentSessions"
              :key="session.id"
              :session="session"
              @toggle-pin="sessionsStore.togglePin(session.id)"
              @rename="(newName) => sessionsStore.renameSession(session.id, newName)"
              @delete="sessionsStore.deleteSession(session.id)"
              @reconnect="sessionsStore.reconnectSession(session.id)"
            />
          </div>
        </div>
      </div>
      <EmptyState v-else title="No sessions yet" message="Create a new session in this workspace to get started." />
    </div>

    <WorkspaceSettingsModal
      :show="isSettingsModalOpen"
      :workspace="activeWorkspace"
      @close="isSettingsModalOpen = false"
      @open-delete-modal="handleOpenDeleteModal"
    />

    <WorkspaceDeleteModal
      :show="isDeleteModalOpen"
      :workspace="workspaceToDelete"
      @close="isDeleteModalOpen = false"
    />
    <UploadFileModal :show="isUploadModalOpen" @close="isUploadModalOpen = false" />
    <McpServerManagerModal
      scope="workspace"
      :show="isMcpModalOpen"
      :workspace="activeWorkspace"
      @close="isMcpModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useSessionsStore } from '@/stores/sessions';
import { useWorkspacesStore } from '@/stores/workspaces';
import { storeToRefs } from 'pinia';
import { computed, watch, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Workspace } from '@waylaidwanderer/sumika-types';
import SessionListItem from '@/components/SessionListItem.vue';
import SessionListSkeleton from '@/components/SessionListSkeleton.vue';
import NewSessionCard from '@/components/NewSessionCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import WorkspaceSettingsModal from '@/components/WorkspaceSettingsModal.vue';
import WorkspaceDeleteModal from '@/components/WorkspaceDeleteModal.vue';
import ActionStub from '@/components/ActionStub.vue';
import UploadFileModal from '@/components/UploadFileModal.vue';
import McpServerManagerModal from '@/components/McpServerManagerModal.vue';
import { Cog6ToothIcon, CircleStackIcon } from '@heroicons/vue/24/solid';
import UtsuwaLogo from '@/components/UtsuwaLogo.vue';

const sessionsStore = useSessionsStore();
const { sessions, status } = storeToRefs(sessionsStore);

const workspacesStore = useWorkspacesStore();
const { workspaces, activeWorkspaceId } = storeToRefs(workspacesStore);

const route = useRoute();
const isSettingsModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isUploadModalOpen = ref(false);
const isMcpModalOpen = ref(false);
const workspaceToDelete = ref<Workspace | null>(null);

const activeWorkspace = computed(() => activeWorkspaceId.value ? workspaces.value[activeWorkspaceId.value] : null);
const sessionsArray = computed(() => Object.values(sessions.value));
const totalSessionsCount = computed(() => sessionsArray.value.length);
const activeSessionsCount = computed(() => sessionsArray.value.filter(s => s.status === 'thinking').length);
const awaitingInputCount = computed(() => sessionsArray.value.filter(s => s.status === 'awaiting_permission').length);

const pinnedSessions = computed(() =>
  sessionsArray.value.filter((s) => s.pinned).sort((a, b) => a.name.localeCompare(b.name))
);

const recentSessions = computed(() => sessionsArray.value.filter((s) => !s.pinned));

watch(() => route.params.workspaceId, (newId) => {
    if (typeof newId === 'string') {
        sessionsStore.setActiveSessionId(null);
        workspacesStore.setActiveWorkspaceId(newId);
        sessionsStore.loadSessionsForWorkspace(newId);
    }
}, { immediate: true });

function handleOpenDeleteModal() {
  workspaceToDelete.value = activeWorkspace.value;
  isDeleteModalOpen.value = true;
}
</script>
