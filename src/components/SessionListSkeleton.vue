<template>
  <div class="space-y-3 animate-pulse">
    <!-- Skeleton for a single list item -->
    <div v-for="i in 3" :key="i" class="flex items-stretch gap-2">
      <div class="flex-1 block bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
        <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
        <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mt-2"></div>
      </div>
      <div class="flex items-center">
        <div class="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
      </div>
    </div>
  </div>
</template>
