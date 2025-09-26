<template>
  <div class="space-y-3 animate-pulse">
    <div v-for="i in 3" :key="i" class="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
      <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
      <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mt-2"></div>
      <div class="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mt-3"></div>
    </div>
  </div>
</template>
