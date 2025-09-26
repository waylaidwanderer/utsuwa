import type { SessionData, PromptContent } from '@waylaidwanderer/sumika-types';

const API_BASE_URL = '';

class SessionApiService {
  // A generic fetch wrapper for consistent error handling and headers
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
      // Re-throw the error to be handled by the calling action in the store.
      throw error;
    }
  }

  async getAllSessions(workspaceId: string): Promise<SessionData[]> {
    return this.fetch<SessionData[]>(`/api/sessions?workspaceId=${workspaceId}&view=summary`);
  }

  async createSession(workspaceId: string): Promise<SessionData> {
    return this.fetch<SessionData>('/api/sessions', { 
      method: 'POST',
      body: JSON.stringify({ workspaceId }),
    });
  }

  async getSessionById(sessionId: string): Promise<SessionData> {
    return this.fetch<SessionData>(`/api/sessions/${sessionId}`);
  }

  async updateSession(
    sessionId: string,
    updates: Partial<Pick<SessionData, 'name' | 'pinned'>>
  ): Promise<SessionData> {
    return this.fetch<SessionData>(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.fetch<void>(`/api/sessions/${sessionId}`, { method: 'DELETE' });
  }

  async branchSession(sessionId: string, branchFromMessageId: string): Promise<SessionData> {
    return this.fetch<SessionData>(`/api/sessions/${sessionId}/branch`, {
      method: 'POST',
      body: JSON.stringify({ branchFromMessageId }),
    });
  }

  // --- Interactive Methods ---

  async sendPrompt(sessionId: string, content: PromptContent[]): Promise<SessionData['messages'][number]> {
    return this.fetch<SessionData['messages'][number]>(`/api/sessions/${sessionId}/prompt`, {
      method: 'POST',
      body: JSON.stringify({ 
        content 
      }),
    });
  }

  async sendPermissionResponse(
    sessionId: string,
    requestId: number,
    outcome: unknown
  ): Promise<void> {
    await this.fetch<void>(`/api/sessions/${sessionId}/permission`, {
      method: 'POST',
      body: JSON.stringify({ requestId, outcome }),
    });
  }

  async cancelPrompt(sessionId: string): Promise<void> {
    await this.fetch<void>(`/api/sessions/${sessionId}/cancel`, {
      method: 'POST',
    });
  }

  async compressHistory(sessionId: string): Promise<void> {
    await this.fetch<void>(`/api/sessions/${sessionId}/compress`, {
      method: 'POST',
    });
  }

  async reloadSession(sessionId: string): Promise<SessionData> {
    return this.fetch<SessionData>(`/api/sessions/${sessionId}/reload`, {
      method: 'POST',
    });
  }

  async reinitializeSession(sessionId: string, force: boolean = false): Promise<SessionData> {
    return this.fetch<SessionData>(`/api/sessions/${sessionId}/reinitialize`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    });
  }

  // --- SSE Listening (Worker logic) ---
  private workers: Map<string, Worker> = new Map();

  listen(
    sessionId: string,
    onMessage: (data: unknown) => void,
    onError: (error: unknown) => void
  ): void {
    // Always terminate any existing worker to ensure a fresh connection.
    this.terminateWorker(sessionId);

    const worker = new Worker(new URL('./sse.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event) => {
      onMessage(event.data);
    };
    worker.onerror = (error) => {
      onError({ message: error.message });
      // Clean up the failed worker instance
      this.terminateWorker(sessionId);
    };
    worker.postMessage({ type: 'start', sessionId });
    this.workers.set(sessionId, worker);
  }

  terminateWorker(sessionId: string): void {
    const worker = this.workers.get(sessionId);
    if (worker) {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
      this.workers.delete(sessionId);
    }
  }
}

export const sessionService = new SessionApiService();
