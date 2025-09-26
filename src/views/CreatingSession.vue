<template>
  <div class="flex flex-col items-center justify-center h-full text-center">
    <div class="w-full max-w-md p-8">
      <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Starting new agent...</h1>
      <p class="text-slate-500 dark:text-slate-400 mb-6">
        Please wait a moment while we prepare your session. This shouldn't take long.
      </p>
      <div
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progress"
        class="relative w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
      >
        <div
          class="absolute top-0 left-0 h-full rounded-full bg-blue-500 transition-all duration-1000 ease-out"
          :class="{ 'is-finished': isFinished }"
          :style="{ width: `${progress}%` }"
        ></div>
        <div class="pulse-animation"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionsStore } from '@/stores/sessions';
import { storeToRefs } from 'pinia';

const router = useRouter();
const sessionsStore = useSessionsStore();
const { newlyCreatedSessionId, status } = storeToRefs(sessionsStore);

const progress = ref(10);
const isFinished = ref(false);
let timeoutId: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  if (status.value !== 'creating') {
    router.push({ name: 'home' });
    return;
  }

  setTimeout(() => {
    if (!isFinished.value) {
      progress.value = 95;
    }
  }, 100);
});

watch(
  newlyCreatedSessionId,
  (newId) => {
    if (newId) {
      isFinished.value = true;
      progress.value = 100;

      const workspaceId = router.currentRoute.value.params.workspaceId as string;

      timeoutId = setTimeout(() => {
        sessionsStore.creationProcessComplete();
        router.push({ 
          name: 'session', 
          params: { workspaceId, sessionId: newId } 
        });
      }, 700);
    }
  },
  { once: true }
);

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
});
</script>

<style scoped>
/* The base transition for the main progress bar fill */
.transition-all {
  transition-property: all;
}

/* The "creep" animation - a very long transition to 95% */
.duration-1000 {
  transition-duration: 15000ms; /* 15 seconds */
}

/* The "pop" animation when finished */
.is-finished {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.5, 1.5, 0.5, 1); /* Bouncy */
}

/* The perpetual "pulse" animation */
.pulse-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  animation: pulse 2s infinite ease-in-out;
  opacity: 0.5;
}

@keyframes pulse {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
