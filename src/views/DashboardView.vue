<template>
  <div class="flex h-screen flex-col font-sans">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme';
import { useWorkspacesStore } from '@/stores/workspaces';

const themeStore = useThemeStore();
themeStore.initializeTheme();

const workspacesStore = useWorkspacesStore();

(async () => {
  await workspacesStore.initializeStore();
})();
</script>
