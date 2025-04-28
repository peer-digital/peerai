/**
 * @deprecated This API is deprecated and will be removed in a future release.
 * Use appTemplates API instead.
 */

import api from '../api/config';
import axios from 'axios';
import { AxiosResponse } from 'axios';

export interface AIApp {
  id: number;
  slug: string;
  name: string;
  description?: string;
  icon_url?: string;
  app_url: string;
  tags?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIAppCreate {
  slug: string;
  name: string;
  description?: string;
  icon_url?: string;
  app_url: string;
  tags?: string[];
}

export interface AIAppUpdate {
  name?: string;
  description?: string;
  icon_url?: string;
  app_url?: string;
  tags?: string[];
  is_active?: boolean;
}

// Create a public API instance without authentication for public endpoints
const publicApi = axios.create({
  baseURL: api.defaults.baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const appStoreApi = {
  // Get all active apps (public endpoint)
  getApps: async (): Promise<AIApp[]> => {
    try {
      console.log('Fetching app store apps...');
      const response: AxiosResponse<AIApp[]> = await publicApi.get('/app-store');
      console.log('App store response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching apps:', error);
      // Return empty array instead of throwing to prevent app from crashing
      return [];
    }
  },

  // Get a specific app by slug (public endpoint)
  getApp: async (slug: string): Promise<AIApp> => {
    const response: AxiosResponse<AIApp> = await publicApi.get(`/app-store/${slug}`);
    return response.data;
  },

  // Create a new app (admin only)
  createApp: async (app: AIAppCreate): Promise<AIApp> => {
    const response: AxiosResponse<AIApp> = await api.post('/app-store', app);
    return response.data;
  },

  // Update an existing app (admin only)
  updateApp: async (slug: string, app: AIAppUpdate): Promise<AIApp> => {
    const response: AxiosResponse<AIApp> = await api.put(`/app-store/${slug}`, app);
    return response.data;
  },

  // Delete an app (admin only)
  deleteApp: async (slug: string): Promise<void> => {
    await api.delete(`/app-store/${slug}`);
  },
};

export default appStoreApi;
