import api from './config';
import { AxiosResponse } from 'axios';

export interface AppTemplate {
  id: number;
  slug: string;
  name: string;
  description?: string;
  icon_url?: string;
  dark_icon_url?: string;
  template_config: {
    schema: any;
    default_values: any;
    uiSchema?: any;
  };
  template_code: string;
  tags?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppTemplateCreate {
  slug: string;
  name: string;
  description?: string;
  icon_url?: string;
  dark_icon_url?: string;
  template_config: {
    schema: any;
    default_values: any;
    uiSchema?: any;
  };
  template_code: string;
  tags?: string[];
  is_active?: boolean;
}

export interface AppTemplateUpdate {
  name?: string;
  description?: string;
  icon_url?: string;
  dark_icon_url?: string;
  template_config?: {
    schema: any;
    default_values: any;
    uiSchema?: any;
  };
  template_code?: string;
  tags?: string[];
  is_active?: boolean;
}

const appTemplatesApi = {
  // Get all templates
  getTemplates: async (): Promise<AppTemplate[]> => {
    try {
      // Call the backend API directly with the correct URL to avoid redirect
      // Remove trailing slash to avoid redirect issues
      const response: AxiosResponse<AppTemplate[]> = await api.get('/app-templates');
      return response.data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Return empty array instead of throwing to prevent app from crashing
      return [];
    }
  },

  // Get a specific template by slug
  getTemplate: async (slug: string): Promise<AppTemplate> => {
    try {
      // Remove trailing slash to avoid redirect issues
      const response: AxiosResponse<AppTemplate> = await api.get(`/app-templates/${slug}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching template ${slug}:`, error);
      throw error;
    }
  },

  // Create a new template (super admin only)
  createTemplate: async (template: AppTemplateCreate): Promise<AppTemplate> => {
    try {
      // Remove trailing slash to avoid redirect issues
      const response: AxiosResponse<AppTemplate> = await api.post('/app-templates', template);
      return response.data;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },

  // Update an existing template (super admin only)
  updateTemplate: async (slug: string, template: AppTemplateUpdate): Promise<AppTemplate> => {
    try {
      console.log(`Updating template ${slug} with data:`, template);
      // Remove trailing slash to avoid redirect issues
      const response: AxiosResponse<AppTemplate> = await api.put(`/app-templates/${slug}`, template);
      console.log(`Update response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating template ${slug}:`, error);
      throw error;
    }
  },

  // Delete a template (super admin only)
  deleteTemplate: async (slug: string): Promise<void> => {
    try {
      // Remove trailing slash to avoid redirect issues
      await api.delete(`/app-templates/${slug}`);
    } catch (error) {
      console.error(`Error deleting template ${slug}:`, error);
      throw error;
    }
  },
};

export default appTemplatesApi;
