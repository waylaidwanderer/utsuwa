<template>
  <!-- Main Draggable Panel -->
  <div
    v-if="!isMinimized"
    ref="panel"
    class="fixed z-50"
    :style="{ top: `${position.y}px`, left: `${position.x}px` }"
  >
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden w-48">
      <div
        @mousedown="dragStart"
        class="p-2 w-full text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-grab active:cursor-grabbing"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <WrenchScrewdriverIcon class="h-5 w-5 text-slate-500 dark:text-slate-400 mr-2" />
            <span class="font-semibold text-sm text-slate-700 dark:text-slate-300">Dev Tools</span>
          </div>
          <div class="flex items-center">
            <button @click.stop="isMinimized = true" class="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer" title="Minimize">
              <MinusIcon class="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </button>
            <button @click.stop="isOpen = !isOpen" class="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer" title="Toggle Content">
              <ChevronUpIcon class="h-5 w-5 text-slate-500 dark:text-slate-400 transition-transform duration-300" :class="{ 'rotate-180': !isOpen }" />
            </button>
          </div>
        </div>
      </div>
      <transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <div v-if="isOpen" class="p-3 border-t border-slate-200 dark:border-slate-700">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <button @click="toast.success('This is a success toast!')" class="px-3 py-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors cursor-pointer">Success</button>
            <button @click="toast.error('This is an error toast!')" class="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors cursor-pointer">Error</button>
            <button @click="toast.warning('This is a warning toast!')" class="px-3 py-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors cursor-pointer">Warning</button>
            <button @click="toast.info('This is an info toast!')" class="px-3 py-1.5 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition-colors cursor-pointer">Info</button>
          </div>
          <div class="mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
            <button @click="sessionsStore.triggerFakeError()" class="w-full px-3 py-1.5 bg-rose-500 text-white rounded-md hover:bg-rose-600 transition-colors cursor-pointer text-sm">Trigger Chat Error</button>
          </div>
        </div>
      </transition>
    </div>
  </div>

  <!-- Minimized "Restore" Tab -->
  <button
    v-if="isMinimized"
    @click="isMinimized = false"
    class="fixed z-50 bottom-0 right-0 p-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-tl-lg shadow-lg border-t border-l border-slate-200 dark:border-slate-700 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-colors cursor-pointer opacity-50 hover:opacity-100"
    title="Restore Dev Tools"
  >
    <WrenchScrewdriverIcon class="h-4 w-4 text-slate-500 dark:text-slate-400" />
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useToast } from 'vue-toastification';
import { WrenchScrewdriverIcon, ChevronUpIcon, MinusIcon } from '@heroicons/vue/24/solid';
import { useSessionsStore } from '@/stores/sessions';

const toast = useToast();
const sessionsStore = useSessionsStore();
const isOpen = ref(false);
const isMinimized = ref(true);
const panel = ref<HTMLElement | null>(null);

// --- Dragging & Position Logic ---
const isDragging = ref(false);
const position = ref({ x: -9999, y: -9999 }); // Start off-screen
const offset = ref({ x: 0, y: 0 });

watch(isOpen, async () => {
  await nextTick();
  updatePosition(position.value.x, position.value.y);
});


function dragStart(event: MouseEvent) {
  event.preventDefault();
  isDragging.value = true;
  offset.value.x = event.clientX - position.value.x;
  offset.value.y = event.clientY - position.value.y;
  document.body.classList.add('select-none');
  window.addEventListener('mousemove', dragMove);
  window.addEventListener('mouseup', dragEnd);
}

function dragMove(event: MouseEvent) {
  if (isDragging.value) {
    const newX = event.clientX - offset.value.x;
    const newY = event.clientY - offset.value.y;
    updatePosition(newX, newY);
  }
}

function dragEnd() {
  isDragging.value = false;
  document.body.classList.remove('select-none');
  window.removeEventListener('mousemove', dragMove);
  window.removeEventListener('mouseup', dragEnd);
}

function updatePosition(newX: number, newY: number) {
  if (!panel.value) return;
  const panelWidth = panel.value.offsetWidth;
  const panelHeight = panel.value.offsetHeight;
  const maxX = window.innerWidth - panelWidth;
  const maxY = window.innerHeight - panelHeight;
  position.value.x = Math.max(0, Math.min(newX, maxX));
  position.value.y = Math.max(0, Math.min(newY, maxY));
}

function handleResize() {
  updatePosition(position.value.x, position.value.y);
}

onMounted(() => {
  if (panel.value) {
    const initialX = window.innerWidth - panel.value.offsetWidth - 16;
    const initialY = window.innerHeight - panel.value.offsetHeight - 16;
    updatePosition(initialX, initialY);
  }
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', dragMove);
  window.removeEventListener('mouseup', dragEnd);
  window.removeEventListener('resize', handleResize);
  document.body.classList.remove('select-none');
});
</script>