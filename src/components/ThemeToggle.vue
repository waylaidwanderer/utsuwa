<template>
  <div class="relative flex items-center bg-slate-200 dark:bg-slate-800 rounded-lg p-1 space-x-1">
    <!-- The sliding background "glider" -->
    <span
      class="absolute top-1 left-1 h-8 w-8 rounded-md shadow-sm transition-transform duration-300 ease-in-out"
      :style="gliderStyle"
    ></span>

    <!-- Buttons (must be z-10 to be on top of the glider) -->
    <button
      @click="themeStore.setTheme('light')"
      class="relative z-10 w-8 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer"
      :class="themeStore.theme === 'light' ? 'text-white' : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
      title="Light Mode"
    >
      <SunIcon class="h-5 w-5" />
    </button>
    <button
      @click="themeStore.setTheme('dark')"
      class="relative z-10 w-8 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer"
      :class="themeStore.theme === 'dark' ? 'text-white' : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
      title="Dark Mode"
    >
      <MoonIcon class="h-5 w-5" />
    </button>
    <button
      @click="themeStore.setTheme('system')"
      class="relative z-10 w-8 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer"
      :class="themeStore.theme === 'system' ? 'text-white' : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
      title="System Preference"
    >
      <ComputerDesktopIcon class="h-5 w-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useThemeStore } from '@/stores/theme';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/vue/24/solid';

const themeStore = useThemeStore();

const gliderStyle = computed(() => {
  const themeOrder = ['light', 'dark', 'system'];
  const activeIndex = themeOrder.indexOf(themeStore.theme);
  // Each button is w-8 (2rem) and the space between them is space-x-1 (0.25rem).
  const offset = activeIndex * (2 + 0.25);
  const gradientLight = 'linear-gradient(135deg, rgba(70, 118, 190, 0.68), rgba(66, 148, 168, 0.68))';
  const gradientDark = 'linear-gradient(135deg, rgba(60, 96, 160, 0.7), rgba(56, 125, 146, 0.7))';
  return {
    transform: `translateX(${offset}rem)`,
    background: themeStore.theme === 'dark' ? gradientDark : gradientLight,
    boxShadow: themeStore.theme === 'dark'
      ? '0 6px 12px -8px rgba(17, 24, 39, 0.9)'
      : '0 6px 12px -8px rgba(30, 64, 175, 0.35)'
  };
});
</script>
