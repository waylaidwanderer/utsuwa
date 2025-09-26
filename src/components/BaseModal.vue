<template>
  <teleport to="body">
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="show" @click.self="$emit('close')" class="thin-scrollbar fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 px-4 py-12 backdrop-blur-sm" tabindex="-1">
        <transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="show" class="w-full rounded-xl bg-white shadow-xl dark:bg-slate-800 overflow-hidden" :class="maxWidthClass">
            <div class="h-1 rounded-t-xl border-t-2 border-blue-200 dark:border-emerald-500/40"></div>
            <div class="px-6 py-6">
              <h2 class="text-lg font-bold text-slate-800 dark:text-slate-200">{{ title }}</h2>
              <div class="mt-4">
                <slot></slot>
              </div>
              <div class="mt-6 flex justify-end space-x-3">
                <slot name="actions"></slot>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  show: { type: Boolean, required: true },
  title: { type: String, required: true },
  maxWidth: {
    type: String,
    default: 'md',
  },
});

defineEmits(['close']);

const widthMap: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-5xl',
  full: 'max-w-full',
};

const maxWidthClass = computed(() => widthMap[props.maxWidth] ?? widthMap.md);
</script>
