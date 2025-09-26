<template>
  <UserMessage v-if="message.type === 'user'" :message="message" />
  <AgentMessage v-else-if="message.type === 'agent'" :message="message" />
  <ToolCall v-else-if="message.type === 'tool_call'" :message="message" />
  <ErrorMessage v-else-if="message.type === 'error'" :message="message" />
  <HistorySummary v-else-if="message.type === 'history_summary'" :message="message" @showSummary="emit('showSummary', $event)" />
</template>

<script setup lang="ts">
import type { Message, ThoughtMessage, HistorySummaryMessage } from '@waylaidwanderer/sumika-types';
import UserMessage from './messages/UserMessage.vue';
import AgentMessage from './messages/AgentMessage.vue';
import ToolCall from './messages/ToolCall.vue';
import ErrorMessage from './messages/ErrorMessage.vue';
import HistorySummary from './messages/HistorySummary.vue';

type DisplayMessage = Exclude<Message, ThoughtMessage>;

defineProps<{
  message: DisplayMessage;
}>();

const emit = defineEmits<{
  (e: 'showSummary', message: HistorySummaryMessage): void;
}>();
</script>
