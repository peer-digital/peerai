import api from './config';
import { AxiosResponse } from 'axios';

export interface DeployedApp {
  id: number;
  template_id: number;
  team_id: number | null;
  deployed_by_id: number;
  name: string;
  slug: string;
  configuration: Record<string, any> | null;
  custom_code: string | null;
  public_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeployedAppDetail extends DeployedApp {
  template: {
    id: number;
    slug: string;
    name: string;
    description?: string;
    icon_url?: string;
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
  };
  deployed_by: {
    id: number;
    email: string;
    full_name: string;
  };
  team?: {
    id: number;
    name: string;
    [key: string]: any;
  };
}

export interface DeployedAppCreate {
  template_id: number;
  team_id?: number;
  name: string;
  slug: string;
  configuration?: Record<string, any>;
  custom_code?: string;
  is_active?: boolean;
}

export interface DeployedAppUpdate {
  name?: string;
  configuration?: Record<string, any>;
  custom_code?: string;
  public_url?: string;
  is_active?: boolean;
}

const deployedAppsApi = {
  // Get all deployed apps
  getDeployedApps: async (teamId?: number): Promise<DeployedApp[]> => {
    const url = teamId ? `/deployed-apps/?team_id=${teamId}` : '/deployed-apps/';
    console.log(`Fetching deployed apps from: ${url}`);
    console.log(`Using token: ${localStorage.getItem('access_token')?.substring(0, 10)}...`);
    const response: AxiosResponse<DeployedApp[]> = await api.get(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response.data;
  },

  // Get a specific deployed app by slug
  getDeployedApp: async (slug: string): Promise<DeployedAppDetail> => {
    const response: AxiosResponse<DeployedAppDetail> = await api.get(`/deployed-apps/${slug}`);
    return response.data;
  },

  // Deploy a new app
  deployApp: async (app: DeployedAppCreate): Promise<DeployedApp> => {
    console.log('Deploying app with data:', app);
    console.log('Using token:', localStorage.getItem('access_token')?.substring(0, 10) + '...');
    const response: AxiosResponse<DeployedApp> = await api.post('/deployed-apps/', app, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response.data;
  },

  // Update a deployed app
  updateDeployedApp: async (slug: string, app: DeployedAppUpdate): Promise<DeployedApp> => {
    const response: AxiosResponse<DeployedApp> = await api.put(`/deployed-apps/${slug}`, app);
    return response.data;
  },

  // Delete a deployed app
  deleteDeployedApp: async (slug: string): Promise<void> => {
    await api.delete(`/deployed-apps/${slug}`);
  },
};

export default deployedAppsApi;
