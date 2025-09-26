<template>
  <div class="text-center py-16">
    <div class="inline-block bg-slate-100 dark:bg-slate-800 p-4 rounded-full">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-12 w-12 text-slate-400 dark:text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    </div>
    <h3 class="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">{{ title }}</h3>
    <p class="mt-2 text-slate-500 dark:text-slate-400">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  message: string;
}>();
</script>