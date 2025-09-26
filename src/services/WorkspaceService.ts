import type { Workspace } from '@waylaidwanderer/sumika-types';

const API_BASE_URL = '';

class WorkspaceApiService {
  private async fetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }
      if (response.status === 204) {
        return null as T;
      }
      return response.json() as T;
    } catch (error) {
      const context = `${options.method || 'GET'} ${url}`;
      console.error(`API Error in ${context}:`, error);
      throw error;
    }
  }

  async getAllWorkspaces(): Promise<Workspace[]> {
    return this.fetch<Workspace[]>('/api/workspaces');
  }

  async createWorkspace(name: string, description?: string, path?: string): Promise<Workspace> {
    return this.fetch<Workspace>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, description, path }),
    });
  }

  async updateWorkspace(
    workspaceId: string,
    updates: Partial<Pick<Workspace, 'name' | 'description' | 'pinned' | 'env'>>
  ): Promise<Workspace> {
    return this.fetch<Workspace>(`/api/workspaces/${workspaceId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async checkWorkspaceEmptiness(workspaceId: string): Promise<{ isEmpty: boolean }> {
    return this.fetch<{ isEmpty: boolean }>(`/api/workspaces/${workspaceId}/check-emptiness`);
  }

  async deleteWorkspace(workspaceId: string, deleteFiles: boolean): Promise<void> {
    await this.fetch<void>(`/api/workspaces/${workspaceId}?deleteFiles=${deleteFiles}`, { method: 'DELETE' });
  }

  async checkFileExists(workspaceId: string, filename: string): Promise<{ exists: boolean }> {
    const encodedFilename = encodeURIComponent(filename);
    return this.fetch<{ exists: boolean }>(`/api/workspaces/${workspaceId}/files/exists?filename=${encodedFilename}`);
  }

  async uploadFile(workspaceId: string, file: File, overwrite: boolean = false): Promise<{ message: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `/api/workspaces/${workspaceId}/upload${overwrite ? '?overwrite=true' : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        // Special handling for 409 Conflict
        if (response.status === 409) {
          const errorJson = (await response.json().catch(() => ({ error: 'File already exists.' }))) as { error?: string };
          const conflictError = new Error(errorJson.error || 'File already exists.') as Error & { status?: number };
          conflictError.status = 409;
          throw conflictError;
        }
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }
      return response.json();
    } catch (error) {
      console.error(`API Error in POST ${url}:`, error);
      throw error;
    }
  }

  async searchFiles(workspaceId: string, query: string): Promise<string[]> {
    const encodedQuery = encodeURIComponent(query);
    return this.fetch<string[]>(`/api/workspaces/${workspaceId}/files/search?query=${encodedQuery}`);
  }
}

export const workspaceService = new WorkspaceApiService();
