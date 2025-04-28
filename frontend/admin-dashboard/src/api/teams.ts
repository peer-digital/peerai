import api from './config';
import { AxiosResponse } from 'axios';

export interface Team {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

const teamsApi = {
  // Get all teams
  getTeams: async (): Promise<Team[]> => {
    const response: AxiosResponse<Team[]> = await api.get('/teams');
    return response.data;
  },

  // Get a specific team by ID
  getTeam: async (id: number): Promise<Team> => {
    const response: AxiosResponse<Team> = await api.get(`/teams/${id}`);
    return response.data;
  },

  // Create a new team
  createTeam: async (name: string): Promise<Team> => {
    const response: AxiosResponse<Team> = await api.post('/teams', { name });
    return response.data;
  },

  // Update a team
  updateTeam: async (id: number, name: string): Promise<Team> => {
    const response: AxiosResponse<Team> = await api.put(`/teams/${id}`, { name });
    return response.data;
  },

  // Delete a team
  deleteTeam: async (id: number): Promise<void> => {
    await api.delete(`/teams/${id}`);
  },
};

export default teamsApi;
