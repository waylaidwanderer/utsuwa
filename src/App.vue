<template>
  <router-view />
  <DevTools v-if="isDevMode" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import DevTools from '@/components/DevTools.vue';

const isDevMode = computed(() => import.meta.env.DEV);
</script>
