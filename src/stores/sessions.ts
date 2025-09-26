import { defineStore } from 'pinia';
import { sessionService } from '@/services/SessionService';
import router from '@/router';
import { useApiErrorHandler } from '@/composables/useApiErrorHandler';
import { useWorkspacesStore } from './workspaces';
import { useToast } from 'vue-toastification';

import type { SessionData as ApiSessionData, Message, ToolCallMessage, PromptContent, HistorySummaryMessage } from '@waylaidwanderer/sumika-types';

type ClientSessionData = ApiSessionData & {
  isUpdating?: boolean;
};

function appendMessage(session: ClientSessionData, message: Message) {
  if (!Array.isArray(session.messages)) {
    session.messages = [message];
  } else {
    session.messages.splice(session.messages.length, 0, message);
  }
}

const toast = useToast();

// --- Store Definitions ---

type QueueState = 'queued' | 'sending' | 'submitted' | 'streaming' | 'stopped' | 'failed' | 'sent';

interface PromptEntry {
  id: string; // message id
  content: PromptContent[];
  status: QueueState;
  createdAt: string;
}

interface PromptTracker {
  order: string[];
  entries: Record<string, PromptEntry>;
  activeId: string | null;
  revision: number;
}

interface FileSearchState {
  show: boolean;
  query: string;
  results: string[];
  selectedIndex: number;
  isLoading: boolean;
}

interface SessionsState {
  sessions: Record<string, ClientSessionData>;
  activeSessionId: string | null;
  status: 'loading' | 'creating' | 'idle' | 'error';
  isCompressing: boolean;
  newlyCreatedSessionId: string | null;
  justBranchedSessionId?: string | null;
  lastPromptBySession: Record<string, string>;
  everConnected: Record<string, boolean>;
  promptTrackers: Record<string, PromptTracker>;
  promptStateByMessageId: Record<string, PromptEntry>;
  promptSessionByMessageId: Record<string, string>;
  fileSearch: FileSearchState;
}

type ToolCallContentItem = {
  type?: string;
  text?: string;
  content?: { text?: string };
  path?: string;
  oldText?: string;
  newText?: string;
  [key: string]: unknown;
};

type PermissionOption = {
  optionId: string;
  kind: string;
  label?: string;
  [key: string]: unknown;
};

type PermissionRequestEvent = {
  type: 'permission_request';
  toolCall: {
    toolCallId: string;
    kind: string;
    title: string;
    content?: ToolCallContentItem[];
  };
  requestId: number;
  options?: PermissionOption[];
};

type AgentMessageChunkEvent = {
  type: 'chunk';
  sessionUpdate: 'agent_message_chunk';
  content: { text: string };
  messageId?: string;
};

type ThoughtChunkEvent = {
  type: 'chunk';
  sessionUpdate: 'agent_thought_chunk';
  content: { text: string };
};

type ToolCallChunkEvent = {
  type: 'chunk';
  sessionUpdate: 'tool_call';
  toolCallId: string;
  kind: string;
  title: string;
  status?: ToolCallMessage['status'];
  content?: ToolCallContentItem[];
};

type ToolCallUpdateEvent = {
  type: 'chunk';
  sessionUpdate: 'tool_call_update';
  toolCallId: string;
  status?: ToolCallMessage['status'];
  content?: ToolCallContentItem[];
};

type ChunkEvent = AgentMessageChunkEvent | ThoughtChunkEvent | ToolCallChunkEvent | ToolCallUpdateEvent;

type ErrorEvent = {
  type: 'error';
  error: {
    data?: { details?: string };
    message?: string;
    [key: string]: unknown;
  };
};

import { workspaceService } from '@/services/WorkspaceService';
import { debounce } from 'lodash-es';

type SessionEvent =
  | { type: 'ready' }
  | { type: 'end' }
  | { type: 'connection_error' }
  | { type: 'history_compressed', summaryMessage: Message }
  | ErrorEvent
  | PermissionRequestEvent
  | ChunkEvent;

function isSessionEvent(data: unknown): data is SessionEvent {
  return typeof data === 'object' && data !== null && 'type' in data && typeof (data as { type: unknown }).type === 'string';
}

let messageIdCounter = 0;

function generateMessageId(prefix = 'msg'): string {
  const globalCrypto = typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return `${prefix}-${globalCrypto.randomUUID()}`;
  }
  const suffix = `${Date.now().toString(36)}-${(messageIdCounter++).toString(36)}`;
  return `${prefix}-${suffix}`;
}

interface FileSearchState {
  show: boolean;
  query: string;
  results: string[];
  selectedIndex: number;
  isLoading: boolean;
}

export const useSessionsStore = defineStore('sessions', {
  state: (): SessionsState => ({
    sessions: {},
    activeSessionId: null,
    status: 'idle',
    isCompressing: false,
    newlyCreatedSessionId: null,
    justBranchedSessionId: null,
    lastPromptBySession: {},
    everConnected: {},
    promptTrackers: {},
    promptStateByMessageId: {},
    promptSessionByMessageId: {},
    fileSearch: {
      show: false,
      query: '',
      results: [],
      selectedIndex: 0,
      isLoading: false,
    },
  }),

  getters: {
    promptEntriesBySession: (state) => {
      return (sessionId: string): PromptEntry[] => {
        const tracker = state.promptTrackers[sessionId];
        if (!tracker) return [];
        return tracker.order
          .map((id) => tracker.entries[id])
          .filter((entry): entry is PromptEntry => !!entry);
      };
    },
    activePromptEntry: (state) => {
      return (sessionId: string): PromptEntry | undefined => {
        const tracker = state.promptTrackers[sessionId];
        if (!tracker || !tracker.activeId) return undefined;
        return tracker.entries[tracker.activeId];
      };
    },
    promptRevision: (state) => {
      return (sessionId: string): number => state.promptTrackers[sessionId]?.revision ?? 0;
    },
    promptStateForMessage: (state) => {
      return (messageId: string): PromptEntry | undefined => state.promptStateByMessageId[messageId];
    },
  },

  actions: {
    _handleError: useApiErrorHandler(),

    async loadSessionsForWorkspace(workspaceId: string | null) {
      if (!workspaceId) {
        this.sessions = {};
        this.activeSessionId = null;
        return;
      }

      this.status = 'loading';
      try {
        const newSessionsState: Record<string, ClientSessionData> = {};

        // Preserve the active session only if it's fully loaded and belongs to the workspace we're loading.
        const activeSession = this.activeSessionId ? this.sessions[this.activeSessionId] : null;
        if (activeSession && activeSession.workspaceId === workspaceId && activeSession.messages?.length > 0) {
          newSessionsState[activeSession.id] = activeSession;
        }

        const newSessionsList = await sessionService.getAllSessions(workspaceId);

        for (const sessionSummary of newSessionsList) {
          const existingPreserved = newSessionsState[sessionSummary.id];
          newSessionsState[sessionSummary.id] = {
            ...existingPreserved,
            ...sessionSummary,
          } as ClientSessionData;
        }

        // Atomically replace the old state with the new one.
        this.sessions = newSessionsState;

      } catch (error) {
        this.status = 'error';
        this._handleError(error, 'load sessions');
      } finally {
        this.status = 'idle';
      }
    },

    async fetchAndSetActiveSession(sessionId: string) {
      try {
        // Rehydrate and clean the prompt tracker FIRST to prevent race conditions on load.
        this._rehydratePromptTracker(sessionId);

        console.log(`[FetchSession] Getting session ${sessionId} from server...`);
        const fullSession = await sessionService.getSessionById(sessionId);
        console.log('[FetchSession] Got session data from server:', JSON.parse(JSON.stringify(fullSession)));

        // Clean up the rehydrated prompt tracker by removing any prompts that
        // are already present in the authoritative message list from the server.
        const tracker = this._getPromptTracker(sessionId);
        if (Array.isArray(fullSession.messages)) {
          const serverMessageIds = new Set(fullSession.messages.map(m => m.id));
          const messageIdsToPrune = tracker.order.filter(id => serverMessageIds.has(id));
          for (const messageId of messageIdsToPrune) {
            console.log(`[FetchSession] Pruning already-processed prompt ${messageId} from local queue.`);
            this._finalizePromptEntry(sessionId, messageId);
          }
        }

        this.sessions[sessionId] = fullSession;
        this._syncPromptMessages(sessionId);
        this.activeSessionId = sessionId;
        
        console.log('[FetchSession] Rehydration complete.');

        this._processQueue(sessionId);
      } catch (error) {
        this._handleError(error, `fetch session ${sessionId}`);
        router.push('/'); // Redirect home if session can't be fetched
      }
    },

    async createSession() {
      const workspacesStore = useWorkspacesStore();
      const activeWorkspaceId = workspacesStore.activeWorkspaceId;
      if (!activeWorkspaceId) {
        this._handleError(new Error('No active workspace selected.'), 'create session');
        return;
      }

      this.status = 'creating';
      this.newlyCreatedSessionId = null;
      router.push({ name: 'new-session', params: { workspaceId: activeWorkspaceId } });

      try {
        const newSession = await sessionService.createSession(activeWorkspaceId);
        this.sessions[newSession.id] = newSession;
        this.newlyCreatedSessionId = newSession.id;
      } catch (error) {
        this._handleError(error, 'create a new session');
        router.push({ name: 'workspace-detail', params: { workspaceId: activeWorkspaceId } });
        this.status = 'idle';
      }
    },

    creationProcessComplete() {
      this.status = 'idle';
    },

    setActiveSessionId(sessionId: string | null) {
      if (sessionId && this.sessions[sessionId]) {
        this.activeSessionId = sessionId;
      } else {
        this.activeSessionId = null;
      }
    },

    listenToSession(sessionId: string) {
      console.log(`[Store] listenToSession called for session ${sessionId}`);
      const session = this.sessions[sessionId];
      if (session?.status === 'disconnected') {
        console.log(`[Store] Session ${sessionId} is disconnected, setting status to reinitializing.`);
        session.status = 'reinitializing';
      }

      sessionService.listen(
        sessionId,
        (data) => this._handleSseMessage(sessionId, data),
        (error) => {
          // The 'error' can be a standard ErrorEvent or our custom JSON object
          let errorMessage = 'An unknown error occurred.';
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'object' && error !== null && 'error' in error) {
            // Handle our custom { type: 'error', error: '...' } structure
            errorMessage = String((error as ErrorEvent).error);
          }

          console.error(
            `[Store] Error while listening to real-time updates for session ${sessionId}:`,
            errorMessage,
            error // Log the original object for debugging
          );

          if (this.sessions[sessionId]) {
            this.sessions[sessionId].status = 'disconnected';
            this._scheduleReconnect(sessionId);
          }
        }
      );
      // Kick queue processing on (re)listen in case we are idle and have pending items
      this._processQueue(sessionId);
    },

    async _handleSseMessage(sessionId: string, data: unknown) {
      const session = this.sessions[sessionId];
      if (!session) return;

      if (!isSessionEvent(data)) {
        console.warn('[Store] Ignoring unknown SSE payload', data);
        return;
      }

      const message = data;

      switch (message.type) {
        case 'history_compressed':
          if (message.summaryMessage) {
            const summary = message.summaryMessage as HistorySummaryMessage;
            const targetIndex = session.messages.findIndex(m => m.id === summary.after);
            if (targetIndex !== -1) {
              session.messages.splice(targetIndex + 1, 0, summary);
            } else {
              // Fallback: just add to the end
              session.messages.push(summary);
            }
          }
          break;
        case 'ready':
          if (session.status === 'disconnected' || session.status === 'reinitializing') {
            session.status = 'idle';
          }
          this.everConnected[sessionId] = true;
          this._clearReconnect(sessionId);
          // Try to process next queued item now that we're ready
          this._processQueue(sessionId);
          break;
        case 'end':
          session.status = 'idle';
          this._onSseEnd(sessionId);
          break;
        case 'error': {
          const detailSource = message.error.data?.details ?? message.error.message;
          const isAbort = typeof detailSource === 'string' && /abort/i.test(detailSource);
          if (isAbort) {
            // Expected error from a user cancel; do not disconnect or show error
            this._handleCancelSseError(sessionId);
            break;
          }
          // Do not disconnect SSE for agent errors; surface as chat error and keep session idle
          session.messages.push({
            id: generateMessageId(),
            type: 'error',
            error: message.error,
          });
          session.status = 'idle';
          // Any agent error means the turn is over. Clean up the queue.
          this._onSseEnd(sessionId);
          break;
        }
        case 'connection_error':
          // Network or server failure — out of our control: mark disconnected and retry
          if (this.sessions[sessionId]) {
            this.sessions[sessionId].status = 'disconnected';
          }
          toast.error('Connection lost. Reconnecting…');
          this._scheduleReconnect(sessionId);
          break;
        case 'permission_request': {
          this._markPromptAsSent(sessionId);
          const { toolCall } = message;
          const toolCallDetails: NonNullable<ToolCallMessage['details']> = {};
          const diff = toolCall.content?.find((item) => item.type === 'diff');
          if (diff) {
            toolCallDetails.path = diff.path;
            toolCallDetails.oldContent = diff.oldText;
            toolCallDetails.content = diff.newText;
          }
          session.messages.push({
            id: generateMessageId(),
            type: 'tool_call',
            toolCallId: toolCall.toolCallId,
            kind: toolCall.kind,
            title: toolCall.title,
            input: '',
            output: '',
            status: 'awaiting_permission',
            details: Object.keys(toolCallDetails).length ? toolCallDetails : undefined,
            requestId: message.requestId,
            options: message.options,
          });
          break;
        }
        case 'chunk':
          this._markPromptAsSent(sessionId);
          this._handleChunk(session, message);
          break;
      }
    },

    _handleChunk(session: ClientSessionData, chunk: ChunkEvent) {
      switch (chunk.sessionUpdate) {
        case 'agent_message_chunk': {
          const backendMessageId = (chunk as AgentMessageChunkEvent).messageId;
          if (backendMessageId) {
            const messageToUpdate = session.messages.find(m => m.id === backendMessageId);
            if (messageToUpdate && messageToUpdate.type === 'agent') {
              messageToUpdate.content += chunk.content.text;
            } else {
              session.messages.push({
                id: backendMessageId,
                type: 'agent',
                content: chunk.content.text,
              });
            }
          } else {
            console.error('Agent message chunk received without a messageId!', chunk);
          }
          break;
        }
        case 'agent_thought_chunk':
          session.messages.push({
            id: generateMessageId(),
            type: 'thought',
            content: chunk.content.text,
          });
          break;
        case 'tool_call': {
          const toolCallDetails: NonNullable<ToolCallMessage['details']> = {};
          const diff = chunk.content?.find((item) => item.type === 'diff');
          if (diff) {
            toolCallDetails.path = diff.path;
            toolCallDetails.oldContent = diff.oldText;
            toolCallDetails.content = diff.newText;
          }
          const inputParts = (chunk.content ?? [])
            .map((item) => item.text ?? item.content?.text ?? '')
            .filter((value): value is string => !!value);
          session.messages.push({
            id: generateMessageId(),
            type: 'tool_call',
            toolCallId: chunk.toolCallId,
            kind: chunk.kind,
            title: chunk.title,
            input: inputParts.join('\n'),
            output: '',
            status: chunk.status ?? 'in_progress',
            details: Object.keys(toolCallDetails).length ? toolCallDetails : undefined,
          });
          break;
        }
        case 'tool_call_update': {
          const toolCallMsg = session.messages.find(
            (m: Message): m is ToolCallMessage => m.type === 'tool_call' && m.toolCallId === chunk.toolCallId
          );
          if (!toolCallMsg) break;

          if (chunk.content) {
            toolCallMsg.details = toolCallMsg.details || {};
            toolCallMsg.details.rawContent = JSON.stringify(chunk.content, null, 2);

            for (const item of chunk.content) {
              if (item.type === 'diff') {
                toolCallMsg.details.path = item.path;
                toolCallMsg.details.oldContent = item.oldText;
                toolCallMsg.details.content = item.newText;
              }
              else {
                const text = item.content?.text ?? item.text;
                if (text) {
                  toolCallMsg.output += text;
                }
              }
            }
          }

          if (chunk.status) {
            toolCallMsg.status = chunk.status;
          }
          break;
        }
      }
    },

    async reinitializeSession(sessionId: string, force: boolean = false) {
      console.log(`[Store] Attempting to reinitialize session ${sessionId} with force=${force}`);
      const session = this.sessions[sessionId];
      if (!session) {
        console.error(`[Store] Session ${sessionId} not found.`);
        return;
      }

      const currentState = session.status;
      if (currentState !== 'disconnected' && currentState !== 'idle') {
        console.warn(`[Store] Session ${sessionId} is in an invalid state for reinitialization: ${currentState}`);
        return;
      }

      // Explicitly replace the object to guarantee a reactive update before the await.
      this.sessions[sessionId] = { ...session, status: 'reinitializing' };

      try {
        const reinitializedSession = await sessionService.reinitializeSession(sessionId, force);
        // On success, replace our temporary state with the authoritative one from the server.
        this.sessions[sessionId] = reinitializedSession;
        console.log(`[Store] Reinitialization successful for ${sessionId}. Re-attaching listener.`);
        this.listenToSession(sessionId);
      } catch (error) {
        console.error(`[Store] Reinitialization failed for session ${sessionId}:`, error);
        this._handleError(error, `reconnect session "${session.name}"`);
        // On failure, revert the state by replacing the object again.
        this.sessions[sessionId] = { ...session, status: currentState };
      }
    },

    reconnectSession(sessionId: string) {
      const session = this.sessions[sessionId];
      if (!session) return;
      if (session.status !== 'thinking') {
        session.status = 'reinitializing';
      }
      this._clearReconnect(sessionId);
      this.listenToSession(sessionId);
    },

    async reloadSession(sessionId: string): Promise<string | undefined> {
      const existing = this.sessions[sessionId];
      if (!existing) return;
      const previousStatus = existing.status;
      this.sessions[sessionId] = { ...existing, status: 'reinitializing' };
      try {
        const newSession = await sessionService.reloadSession(sessionId);
        if (newSession.id !== sessionId) {
          delete this.sessions[sessionId];
        }
        this.sessions[newSession.id] = newSession;
        this.activeSessionId = newSession.id;
        this.listenToSession(newSession.id);
        return newSession.id;
      } catch (error) {
        this.sessions[sessionId] = { ...existing, status: previousStatus };
        this._handleError(error, 'reload session');
        toast.error('Failed to reload session.');
      }
    },

    async sendMessage(sessionId: string, prompt: string) {
      if (this.isCompressing) return;
      const session = this.sessions[sessionId];
      if (!session) return;
      const messageId = generateMessageId();

      const entry: PromptEntry = {
        id: messageId,
        content: [{ type: 'text', text: prompt }],
        status: 'queued',
        createdAt: new Date().toISOString(),
      };

      this._addPromptEntry(sessionId, entry);
      this.lastPromptBySession[sessionId] = prompt;
      this._processQueue(sessionId);
    },

    // --- Reconnect Backoff Helpers ---
    _clearReconnect(sessionId: string) {
      const timer = reconnectTimers.get(sessionId);
      if (timer) {
        clearTimeout(timer);
        reconnectTimers.delete(sessionId);
      }
      reconnectCounts.delete(sessionId);
    },
    _scheduleReconnect(sessionId: string) {
      if (reconnectTimers.get(sessionId)) return;
      const count = reconnectCounts.get(sessionId) || 0;
      const delays = [2000, 5000, 10000, 30000];
      const delay = delays[Math.min(count, delays.length - 1)];
      const timer = setTimeout(() => {
        reconnectTimers.delete(sessionId);
        reconnectCounts.set(sessionId, (reconnectCounts.get(sessionId) || 0) + 1);
        this.reconnectSession(sessionId);
      }, delay);
      reconnectTimers.set(sessionId, timer as unknown as number);
    },

    async sendPermissionResponse(sessionId: string, requestId: number, optionId: string) {
      const session = this.sessions[sessionId];
      if (!session) return;

      const messageIndex = session.messages.findIndex(
        (m: Message) => m.type === 'tool_call' && m.requestId === requestId
      );
      if (messageIndex === -1) return;

      const requestMessage = session.messages[messageIndex] as ToolCallMessage;

      const originalMessage = { ...requestMessage };
      const selectedOption = requestMessage.options?.find(opt => opt.optionId === optionId);

      // Optimistically update UI by replacing the message object
      const updatedMessage: ToolCallMessage = {
        ...requestMessage,
        selectedOptionId: optionId,
      };

      if (selectedOption && selectedOption.kind.startsWith('reject')) {
        updatedMessage.status = 'cancelled';
        session.status = 'idle';
      } else {
        updatedMessage.status = 'pending';
        session.status = 'thinking';
      }
      
      session.messages.splice(messageIndex, 1, updatedMessage);
      
      const outcome = { outcome: 'selected', optionId };
      try {
        await sessionService.sendPermissionResponse(sessionId, requestId, outcome);
      } catch (error) {
        this._handleError(error, 'respond to the permission request');
        // Revert UI changes on error
        session.messages.splice(messageIndex, 1, originalMessage);
        session.status = 'idle'; // Revert session to idle so user can retry
      }
    },
    async cancelPrompt(sessionId: string) {
      const session = this.sessions[sessionId];
      if (!session) return;

      const active = this._getActivePromptEntry(sessionId);
      if (!active) return;

      this._updatePromptStatus(sessionId, active.id, 'stopped');
      session.status = 'idle';
      try {
        await sessionService.cancelPrompt(sessionId);
      } catch (error) {
        this._handleError(error, 'cancel the prompt');
      }
      this._finalizePromptEntry(sessionId, active.id);
      this._setActivePrompt(sessionId, null);
      this._processQueue(sessionId);
    },

    _handleCancelSseError(sessionId: string) {
      const session = this.sessions[sessionId];
      if (!session) return;
      const active = this._getActivePromptEntry(sessionId);
      if (active) {
        this._updatePromptStatus(sessionId, active.id, 'stopped');
        this._finalizePromptEntry(sessionId, active.id);
      }
      this._setActivePrompt(sessionId, null);
      session.status = 'idle';
      this._processQueue(sessionId);
    },

    // --- Prompt Queue Helpers ---
    _getPromptTracker(sessionId: string): PromptTracker {
      if (!this.promptTrackers[sessionId]) {
        this.promptTrackers[sessionId] = { order: [], entries: {}, activeId: null, revision: 0 };
      }
      return this.promptTrackers[sessionId];
    },
    _persistPromptTracker(sessionId: string) {
      try {
        const tracker = this.promptTrackers[sessionId];
        if (!tracker) return;
        const payload = {
          order: tracker.order,
          activeId: tracker.activeId,
          entries: tracker.order
            .map((id) => tracker.entries[id])
            .filter((entry): entry is PromptEntry => !!entry)
            .map((entry) => ({
              id: entry.id,
              content: entry.content,
              status: entry.status,
              createdAt: entry.createdAt,
            })),
        };
        localStorage.setItem(`prompt:v1:${sessionId}`, JSON.stringify(payload));
      } catch {}
    },
    _rehydratePromptTracker(sessionId: string) {
      try {
        const raw = localStorage.getItem(`prompt:v1:${sessionId}`);
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          order?: string[];
          activeId?: string | null;
          entries?: Array<{ id: string; content: PromptContent[]; status: QueueState; createdAt: string }>;
        };
        const tracker = this._getPromptTracker(sessionId);
        tracker.order = Array.isArray(parsed.order) ? [...parsed.order] : [];
        tracker.entries = {};
        tracker.activeId = parsed.activeId ?? null;
        tracker.revision = 0;
        this._clearPromptStateBySession(sessionId);
        for (const entry of parsed.entries || []) {
          tracker.entries[entry.id] = { ...entry };
          this.promptStateByMessageId[entry.id] = tracker.entries[entry.id];
          this.promptSessionByMessageId[entry.id] = sessionId;
        }
      } catch (e) {
        console.error('[Rehydrate] Error during prompt rehydration:', e);
      }
    },
    _clearPromptStateBySession(sessionId: string) {
      for (const [messageId, owner] of Object.entries(this.promptSessionByMessageId)) {
        if (owner === sessionId) {
          delete this.promptSessionByMessageId[messageId];
          delete this.promptStateByMessageId[messageId];
        }
      }
    },
    _addPromptEntry(sessionId: string, entry: PromptEntry) {
      const tracker = this._getPromptTracker(sessionId);
      tracker.entries[entry.id] = entry;
      if (!tracker.order.includes(entry.id)) {
        tracker.order.push(entry.id);
      }
      this.promptStateByMessageId[entry.id] = entry;
      this.promptSessionByMessageId[entry.id] = sessionId;
      tracker.revision++;
      this._persistPromptTracker(sessionId);
    },
    _updatePromptStatus(sessionId: string, messageId: string, status: QueueState) {
      const tracker = this._getPromptTracker(sessionId);
      const entry = tracker.entries[messageId];
      if (!entry) return;
      if (entry.status === status) return;
      entry.status = status;
      tracker.revision++;
      this.promptStateByMessageId[messageId] = entry;
      this._persistPromptTracker(sessionId);
    },
    _finalizePromptEntry(sessionId: string, messageId: string) {
      const tracker = this._getPromptTracker(sessionId);
      if (!tracker.entries[messageId]) return;
      delete tracker.entries[messageId];
      const idx = tracker.order.indexOf(messageId);
      if (idx >= 0) tracker.order.splice(idx, 1);
      if (tracker.activeId === messageId) {
        tracker.activeId = null;
      }
      delete this.promptStateByMessageId[messageId];
      delete this.promptSessionByMessageId[messageId];
      tracker.revision++;
      this._persistPromptTracker(sessionId);
    },
    _setActivePrompt(sessionId: string, messageId: string | null) {
      const tracker = this._getPromptTracker(sessionId);
      if (tracker.activeId === messageId) return;
      tracker.activeId = messageId;
      tracker.revision++;
      this._persistPromptTracker(sessionId);
    },
    _getActivePromptEntry(sessionId: string): PromptEntry | undefined {
      const tracker = this._getPromptTracker(sessionId);
      if (!tracker.activeId) return undefined;
      return tracker.entries[tracker.activeId];
    },
    _reconcilePromptId(sessionId: string, optimisticId: string, authoritativeId: string) {
      const tracker = this._getPromptTracker(sessionId);
      const entry = tracker.entries[optimisticId];
      if (!entry) return;

      // Update the entry's own ID
      entry.id = authoritativeId;

      // Move the entry in the main tracker
      delete tracker.entries[optimisticId];
      tracker.entries[authoritativeId] = entry;

      // Update the order array
      const orderIndex = tracker.order.indexOf(optimisticId);
      if (orderIndex !== -1) {
        tracker.order[orderIndex] = authoritativeId;
      }

      // Update the active ID if it was the one being reconciled
      if (tracker.activeId === optimisticId) {
        tracker.activeId = authoritativeId;
      }

      // Update the global lookup maps
      delete this.promptStateByMessageId[optimisticId];
      delete this.promptSessionByMessageId[optimisticId];
      this.promptStateByMessageId[authoritativeId] = entry;
      this.promptSessionByMessageId[authoritativeId] = sessionId;

      tracker.revision++;
      this._persistPromptTracker(sessionId);
    },
    _getNextQueuedPrompt(sessionId: string): PromptEntry | undefined {
      const tracker = this._getPromptTracker(sessionId);
      for (const id of tracker.order) {
        const entry = tracker.entries[id];
        if (entry && entry.status === 'queued') {
          return entry;
        }
      }
      return undefined;
    },
    _syncPromptMessages(sessionId: string) {
      const session = this.sessions[sessionId];
      if (!session) return;
      const tracker = this._getPromptTracker(sessionId);
      for (const id of tracker.order) {
        const entry = tracker.entries[id];
        if (!entry) continue;
        if (!Array.isArray(session.messages)) {
          session.messages = [];
        }
        const exists = session.messages.some((msg) => msg.id === id);
        if (!exists) {
          appendMessage(session, { id, type: 'user', content: entry.content });
        }
      }
    },
    async _processQueue(sessionId: string) {
      if (this.isCompressing) return;
      const session = this.sessions[sessionId];
      if (!session) return;

      const tracker = this._getPromptTracker(sessionId);
      if (tracker.activeId) {
        return;
      }

      const next = this._getNextQueuedPrompt(sessionId);
      if (!next) {
        console.log('[ProcessQueue] No queued prompts to process.');
        return;
      }

      console.log('[ProcessQueue] Processing prompt', next.id);
      this._setActivePrompt(sessionId, next.id);
      this._updatePromptStatus(sessionId, next.id, 'sending');

      if (!Array.isArray(session.messages)) {
        session.messages = [];
      }
      const existingMessage = session.messages.find((m) => m.id === next.id);
      if (!existingMessage) {
        appendMessage(session, { id: next.id, type: 'user', content: next.content });
      }

      session.status = 'thinking';

      try {
        const textContent = next.content.find(c => c.type === 'text')?.text ?? '';
        this.lastPromptBySession[sessionId] = textContent;
        
        this._updatePromptStatus(sessionId, next.id, 'submitted');
        const authoritativeMessage = await sessionService.sendPrompt(sessionId, next.content);

        // --- Reconciliation Step ---
        // The server has confirmed the message and returned the authoritative version.
        // We need to replace our optimistic message with the server's version.
        const optimisticMessageIndex = session.messages.findIndex((m) => m.id === next.id);
        if (optimisticMessageIndex !== -1) {
          session.messages.splice(optimisticMessageIndex, 1, authoritativeMessage);
        }
        // Also update the prompt tracker to use the new ID, if it changed.
        // This is crucial for preventing duplicates on refresh.
        if (authoritativeMessage.id !== next.id) {
          this._reconcilePromptId(sessionId, next.id, authoritativeMessage.id);
        }
        // --- End Reconciliation ---

        const active = this._getActivePromptEntry(sessionId);
        if (!active || active.id !== authoritativeMessage.id) {
          console.log('[ProcessQueue] Active prompt changed, skip streaming update');
          return;
        }

        this._updatePromptStatus(sessionId, authoritativeMessage.id, 'streaming');
      } catch (error) {
        this._handleError(error, 'send your message');
        session.status = 'disconnected';
        this._scheduleReconnect(sessionId);
        this._setActivePrompt(sessionId, null);
      }
    },
    _markPromptAsSent(sessionId: string) {
      const active = this._getActivePromptEntry(sessionId);
      if (active && ['sending', 'submitted', 'streaming'].includes(active.status)) {
        this._updatePromptStatus(sessionId, active.id, 'sent');
      }
    },
    _onSseEnd(sessionId: string) {
      const active = this._getActivePromptEntry(sessionId);
      if (!active) return;
      this._finalizePromptEntry(sessionId, active.id);
      this._setActivePrompt(sessionId, null);
      this._processQueue(sessionId);
    },

    async removeQueuedByMessageId(sessionId: string, messageId: string) {
      const tracker = this._getPromptTracker(sessionId);
      const entry = tracker.entries[messageId];
      if (!entry) return;

      const active = this._getActivePromptEntry(sessionId);
      const isActive = active && active.id === messageId;
      if (isActive && (active.status === 'sending' || active.status === 'submitted' || active.status === 'streaming')) {
        try { await sessionService.cancelPrompt(sessionId); } catch {}
      }

      this._finalizePromptEntry(sessionId, messageId);
      if (isActive) {
        this._setActivePrompt(sessionId, null);
        const session = this.sessions[sessionId];
        if (session) session.status = 'idle';
        this._processQueue(sessionId);
      }

      const session = this.sessions[sessionId];
      if (session) {
        const idx = session.messages.findIndex((m) => m.id === messageId);
        if (idx >= 0) session.messages.splice(idx, 1);
      }
    },
    async removeQueuedById(sessionId: string, messageId: string) {
      await this.removeQueuedByMessageId(sessionId, messageId);
    },
    async stopStreamingByMessageId(sessionId: string, messageId: string) {
      const active = this._getActivePromptEntry(sessionId);
      if (!active || active.id !== messageId) return;
      try { await sessionService.cancelPrompt(sessionId); } catch {}
      this._updatePromptStatus(sessionId, messageId, 'stopped');
      this._finalizePromptEntry(sessionId, messageId);
      this._setActivePrompt(sessionId, null);
      const session = this.sessions[sessionId];
      if (session) session.status = 'idle';
      this._processQueue(sessionId);
    },

    async deleteSession(sessionId: string) {
      const session = this.sessions[sessionId];
      if (!session) return;

      session.isUpdating = true;
      try {
        await sessionService.deleteSession(sessionId);
        sessionService.terminateWorker(sessionId);

        if (this.activeSessionId === sessionId) {
          this.setActiveSessionId(null);
          router.push('/');
        }
        delete this.sessions[sessionId];
      } catch (error) {
        this._handleError(error, `delete session "${session.name}"`);
      } finally {
        if (this.sessions[sessionId]) {
          this.sessions[sessionId].isUpdating = false;
        }
      }
    },

    async branchSession(sessionId: string, messageId: string) {
      const workspacesStore = useWorkspacesStore();
      const activeWorkspaceId = workspacesStore.activeWorkspaceId;
      if (!activeWorkspaceId) {
        this._handleError(new Error('Cannot branch session without an active workspace.'), 'branch session');
        return;
      }
      
      try {
        const newSession = await sessionService.branchSession(sessionId, messageId);
        this.sessions[newSession.id] = newSession;
        this.justBranchedSessionId = newSession.id;
        
        router.push({
            name: 'session',
            params: {
                workspaceId: activeWorkspaceId,
                sessionId: newSession.id,
            },
        });

      } catch (error) {
        this._handleError(error, 'branch from session');
        toast.error('Failed to create a branch from the session.');
      }
    },

    async compressCurrentSession(sessionId: string) {
      const session = this.sessions[sessionId];
      if (!session) return;

      this.isCompressing = true;
      try {
        await sessionService.compressHistory(sessionId);
        toast.success('History compressed successfully.');
        // The session will be updated via SSE, so no need to manually update here.
      } catch (error) {
        this._handleError(error, `compress history for session "${session.name}"`);
        if (error instanceof Error && error.message?.includes('malformed')) {
          toast.error('Compression failed: The agent returned an invalid summary. You can try again.');
        } else {
          toast.error('Failed to compress history.');
        }
      } finally {
        this.isCompressing = false;
        this._processQueue(sessionId);
      }
    },

    async togglePin(sessionId: string) {
      const session = this.sessions[sessionId];
      if (!session) return;

      const originalPinStatus = session.pinned;
      session.pinned = !session.pinned;
      try {
        await sessionService.updateSession(sessionId, { pinned: session.pinned });
      } catch (error) {
        session.pinned = originalPinStatus;
        this._handleError(error, `update pin for session "${session.name}"`);
      }
    },

    async renameSession(sessionId: string, newName: string) {
      const session = this.sessions[sessionId];
      if (!session || !newName.trim()) return;

      const originalName = session.name;
      session.name = newName.trim();

      try {
        await sessionService.updateSession(sessionId, { name: session.name });
      } catch (error) {
        session.name = originalName;
        this._handleError(error, `rename session "${originalName}"`);
      }
    },

    triggerFakeError() {
      if (!this.activeSessionId) {
        toast.warning("No active session to add an error to.");
        return;
      }
      const session = this.sessions[this.activeSessionId];
      if (session) {
        session.messages.push({
          id: generateMessageId(),
          type: 'error',
          error: {
            code: -32603,
            message: 'Internal error',
            data: {
              details: 'got status: UNAVAILABLE. {"error":{"code":503,"message":"The model is overloaded. Please try again later.","status":"UNAVAILABLE"}}'
            }
          }
        });
        toast.info("Fake error message added to chat.");
      }
    },

    // --- File Search Actions ---
    _debouncedSearch: debounce(async function (this: ReturnType<typeof useSessionsStore>) {
      const activeWorkspaceId = useWorkspacesStore().activeWorkspaceId;
      if (!activeWorkspaceId || !this.fileSearch.query) {
        this.fileSearch.results = [];
        this.fileSearch.isLoading = false;
        return;
      }
      try {
        const results = await workspaceService.searchFiles(activeWorkspaceId, this.fileSearch.query);
        this.fileSearch.results = results;
      } catch (error) {
        this._handleError(error, 'search for files');
        this.fileSearch.results = [];
      } finally {
        this.fileSearch.isLoading = false;
        this.fileSearch.selectedIndex = 0;
      }
    }, 300),

    updateFileSearchQuery(query: string) {
      this.fileSearch.query = query;
      this.fileSearch.show = true;
      if (query) {
        this.fileSearch.isLoading = true;
        this._debouncedSearch();
      } else {
        this.fileSearch.isLoading = false;
        this.fileSearch.results = [];
        this.fileSearch.selectedIndex = 0;
      }
    },

    hideFileSearch() {
      this.fileSearch.show = false;
      this.fileSearch.query = '';
      this.fileSearch.results = [];
      this.fileSearch.selectedIndex = 0;
    },

    selectNextFile() {
      if (this.fileSearch.results.length > 0) {
        this.fileSearch.selectedIndex = (this.fileSearch.selectedIndex + 1) % this.fileSearch.results.length;
      }
    },

    selectPreviousFile() {
      if (this.fileSearch.results.length > 0) {
        this.fileSearch.selectedIndex = (this.fileSearch.selectedIndex - 1 + this.fileSearch.results.length) % this.fileSearch.results.length;
      }
    },

    getActiveFileSearchResult(): string | null {
      if (this.fileSearch.show && this.fileSearch.results.length > 0) {
        return this.fileSearch.results[this.fileSearch.selectedIndex];
      }
      return null;
    }
  },
});

// Reconnect backoff tracking (not persisted)
const reconnectTimers = new Map<string, number>();
const reconnectCounts = new Map<string, number>();
