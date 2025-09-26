import type { Settings } from '@waylaidwanderer/sumika-types';

const API_BASE_URL = '';

class SettingsApiService {
  private async fetch<T>(url: string, options: RequestInit = {}): Promise<T> {
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
    if (response.status === 204) return null as T;
    return response.json() as T;
  }

  async getSettings(): Promise<Settings> {
    return this.fetch<Settings>('/api/settings');
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    return this.fetch<Settings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async restartAgent(): Promise<{ message: string }> {
    return this.fetch<{ message: string }>('/api/settings/restart-agent', {
      method: 'POST',
    });
  }
}

export const settingsService = new SettingsApiService();

