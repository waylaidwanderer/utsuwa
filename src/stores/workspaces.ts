import { defineStore } from 'pinia';
import { workspaceService } from '@/services/WorkspaceService';
import { useApiErrorHandler } from '@/composables/useApiErrorHandler';
import type { Workspace } from '@waylaidwanderer/sumika-types';
import { useToast } from 'vue-toastification';

const toast = useToast();

interface WorkspacesState {
  workspaces: Record<string, Workspace>;
  activeWorkspaceId: string | null;
  status: 'initializing' | 'loading' | 'idle' | 'error';
}

export const useWorkspacesStore = defineStore('workspaces', {
  state: (): WorkspacesState => ({
    workspaces: {},
    activeWorkspaceId: null,
    status: 'idle',
  }),

  actions: {
    _handleError: useApiErrorHandler(),

    async initializeStore() {
      this.status = 'initializing';
      try {
        const workspaces = await workspaceService.getAllWorkspaces();
        this.workspaces = workspaces.reduce((acc, ws) => {
          acc[ws.id] = ws;
          return acc;
        }, {} as Record<string, Workspace>);
        
        const savedWorkspaceId = localStorage.getItem('activeWorkspaceId');
        if (savedWorkspaceId && this.workspaces[savedWorkspaceId]) {
            this.activeWorkspaceId = savedWorkspaceId;
        } else if (workspaces.length > 0) {
            this.activeWorkspaceId = workspaces[0].id;
        }

      } catch (error) {
        this.status = 'error';
        this._handleError(error, 'load workspaces');
      } finally {
        this.status = 'idle';
      }
    },

    setActiveWorkspaceId(workspaceId: string | null) {
        if (this.activeWorkspaceId === workspaceId) {
          return;
        }
        if (workspaceId) {
            this.activeWorkspaceId = workspaceId;
            localStorage.setItem('activeWorkspaceId', workspaceId);
        } else {
            this.activeWorkspaceId = null;
            localStorage.removeItem('activeWorkspaceId');
        }
    },

    async createWorkspace(name: string, description?: string, path?: string) {
        this.status = 'loading';
        try {
            const newWorkspace = await workspaceService.createWorkspace(name, description, path);
            this.workspaces[newWorkspace.id] = newWorkspace;
            this.setActiveWorkspaceId(newWorkspace.id);
        } catch (error) {
            this._handleError(error, 'create a new workspace');
            throw error; // Re-throw for component to handle UI state
        } finally {
            this.status = 'idle';
        }
    },

    async deleteWorkspace(workspaceId: string, deleteFiles: boolean = false) {
        if (!this.workspaces[workspaceId]) return;
        
        try {
            await workspaceService.deleteWorkspace(workspaceId, deleteFiles);
            delete this.workspaces[workspaceId];

            if (this.activeWorkspaceId === workspaceId) {
                const nextWorkspaceId = Object.keys(this.workspaces)[0] || null;
                this.setActiveWorkspaceId(nextWorkspaceId);
            }
        } catch (error) {
            this._handleError(error, `delete workspace "${this.workspaces[workspaceId]?.name}"`);
        }
    },

    async updateWorkspace(workspaceId: string, updates: Partial<Workspace>) {
        const workspace = this.workspaces[workspaceId];
        if (!workspace) return;

        const originalWorkspace = { ...workspace };
        this.workspaces[workspaceId] = { ...workspace, ...updates };

        try {
            const updatedWorkspace = await workspaceService.updateWorkspace(workspaceId, updates);
            this.workspaces[workspaceId] = updatedWorkspace;
        } catch (error) {
            this.workspaces[workspaceId] = originalWorkspace;
            this._handleError(error, `update workspace "${originalWorkspace.name}"`);
        }
    },

    async uploadFileToWorkspace(workspaceId: string, file: File) {
      try {
        const result = await workspaceService.uploadFile(workspaceId, file);
        toast.success(`Successfully uploaded "${result.filename}"`);
      } catch (error) {
        this._handleError(error, `upload file "${file.name}"`);
      }
    },
  },
});
