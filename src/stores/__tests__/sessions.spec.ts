/// <reference types="vitest/globals" />

import { setActivePinia, createPinia } from 'pinia';
import { useSessionsStore } from '../sessions';
import { useWorkspacesStore } from '../workspaces';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { sessionService } from '@/services/SessionService';
import router from '@/router';
import type { SessionData } from '@waylaidwanderer/sumika-types';

// Mock the dependencies
vi.mock('@/services/SessionService');
vi.mock('@/router');

describe('sessions store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  describe('branchSession action', () => {
    it('should call the session service, add the new session to the store, and navigate', async () => {
      const sessionsStore = useSessionsStore();
      const workspacesStore = useWorkspacesStore();
      
      // Setup initial state
      workspacesStore.activeWorkspaceId = 'test-workspace';
      const originalSessionId = 'original-session';
      const messageId = 'message-to-branch-from';
      const newSession: SessionData = {
        id: 'new-branched-session',
        name: '(Branch @ 12:00:00) Original',
        workspaceId: 'test-workspace',
        messages: [],
        createdAt: new Date().toISOString(),
        pinned: false,
        status: 'idle',
      };

      // Mock the service call
      (sessionService.branchSession as Mock).mockResolvedValue(newSession);

      // Call the action
      await sessionsStore.branchSession(originalSessionId, messageId);

      // Assertions
      expect(sessionService.branchSession).toHaveBeenCalledWith(originalSessionId, messageId);
      expect(sessionsStore.sessions[newSession.id]).toEqual(newSession);
      expect(router.push).toHaveBeenCalledWith({
        name: 'session',
        params: {
          workspaceId: 'test-workspace',
          sessionId: newSession.id,
        },
      });
    });

    it('should handle errors from the session service and not navigate', async () => {
      const sessionsStore = useSessionsStore();
      const workspacesStore = useWorkspacesStore();
      
      // Setup initial state
      workspacesStore.activeWorkspaceId = 'test-workspace';
      const originalSessionId = 'original-session';
      const messageId = 'message-to-branch-from';

      // Mock the service call to throw an error
      const testError = new Error('Branching failed');
      (sessionService.branchSession as Mock).mockRejectedValue(testError);

      // We need to mock the error handler to prevent it from logging to the console during tests
      const handleErrorMock = vi.fn();
      sessionsStore._handleError = handleErrorMock;

      // Call the action
      await sessionsStore.branchSession(originalSessionId, messageId);

      // Assertions
      expect(sessionService.branchSession).toHaveBeenCalledWith(originalSessionId, messageId);
      expect(handleErrorMock).toHaveBeenCalledWith(testError, 'branch from session');
      expect(router.push).not.toHaveBeenCalled();
    });

    it('should not do anything if there is no active workspace', async () => {
        const sessionsStore = useSessionsStore();
        const workspacesStore = useWorkspacesStore();
        
        // Setup initial state with no active workspace
        workspacesStore.activeWorkspaceId = null;
  
        const handleErrorMock = vi.fn();
        sessionsStore._handleError = handleErrorMock;
  
        // Call the action
        await sessionsStore.branchSession('some-session', 'some-message');
  
        // Assertions
        expect(sessionService.branchSession).not.toHaveBeenCalled();
        expect(handleErrorMock).toHaveBeenCalledWith(expect.any(Error), 'branch session');
        expect(router.push).not.toHaveBeenCalled();
      });
  });
});