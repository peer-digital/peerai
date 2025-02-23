import { Team, TeamWithMembers, User, Role } from '../types/rbac';
import { apiClient } from './client';

const BASE_PATH = '/api/v1/rbac';

export const rbacApi = {
    // Team operations
    createTeam: async (name: string): Promise<Team> => {
        const response = await apiClient.post(`${BASE_PATH}/teams`, { name });
        return response.data;
    },

    getTeam: async (teamId: number): Promise<TeamWithMembers> => {
        const response = await apiClient.get(`${BASE_PATH}/teams/${teamId}`);
        return response.data;
    },

    // User role operations
    updateUserRole: async (userId: number, newRole: Role): Promise<User> => {
        const response = await apiClient.put(`${BASE_PATH}/users/${userId}/role`, { new_role: newRole });
        return response.data;
    },

    // Team membership operations
    addUserToTeam: async (teamId: number, userId: number): Promise<User> => {
        const response = await apiClient.post(`${BASE_PATH}/teams/${teamId}/members/${userId}`);
        return response.data;
    },

    removeUserFromTeam: async (userId: number): Promise<User> => {
        const response = await apiClient.delete(`${BASE_PATH}/teams/members/${userId}`);
        return response.data;
    },

    getTeamMembers: async (teamId: number): Promise<User[]> => {
        const response = await apiClient.get(`${BASE_PATH}/teams/${teamId}/members`);
        return response.data;
    }
}; 