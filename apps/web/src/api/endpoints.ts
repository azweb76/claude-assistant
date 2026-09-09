import { z } from 'zod';
import {
  agentProfileSchema,
  appSettingsValuesSchema,
  analysisSchema,
  sessionSchema,
  stagedImprovementSchema,
  workspaceSchema,
} from '@claude-assistant/shared';
import { apiRequest } from './client.js';

const workspaceListSchema = z.array(workspaceSchema);
const profileListSchema = z.array(agentProfileSchema);
const sessionListSchema = z.array(sessionSchema);
const sessionDetailSchema = sessionSchema.extend({
  messages: z.array(z.unknown()),
});
const analysisDetailSchema = analysisSchema.extend({
  improvements: z.array(stagedImprovementSchema).optional().default([]),
});

export const api = {
  getSettings: () => apiRequest('/api/settings', appSettingsValuesSchema),
  updateSettings: (body: unknown) =>
    apiRequest('/api/settings', appSettingsValuesSchema, { method: 'PUT', body }),

  listWorkspaces: () => apiRequest('/api/workspaces', workspaceListSchema),
  createWorkspace: (ref: string) =>
    apiRequest('/api/workspaces', workspaceSchema, { method: 'POST', body: { ref } }),
  deleteWorkspace: (id: string) =>
    apiRequest('/api/workspaces/' + id, z.undefined(), { method: 'DELETE' }),

  listProfiles: () => apiRequest('/api/profiles', profileListSchema),
  createProfile: (body: unknown) =>
    apiRequest('/api/profiles', agentProfileSchema, { method: 'POST', body }),
  updateProfile: (id: string, body: unknown) =>
    apiRequest(`/api/profiles/${id}`, agentProfileSchema, { method: 'PUT', body }),
  deleteProfile: (id: string) =>
    apiRequest(`/api/profiles/${id}`, z.undefined(), { method: 'DELETE' }),

  listSessions: () => apiRequest('/api/sessions', sessionListSchema),
  getSession: (id: string) => apiRequest(`/api/sessions/${id}`, sessionDetailSchema),
  createSession: (body: unknown) =>
    apiRequest('/api/sessions', sessionSchema, { method: 'POST', body }),
  cancelSession: (id: string) =>
    apiRequest(`/api/sessions/${id}/cancel`, sessionSchema, { method: 'POST' }),
  followUpSession: (id: string, prompt: string) =>
    apiRequest(`/api/sessions/${id}/messages`, sessionSchema, {
      method: 'POST',
      body: { prompt },
    }),

  createAnalysis: (sessionIds: string[]) =>
    apiRequest('/api/analyses', analysisSchema, { method: 'POST', body: { sessionIds } }),
  getAnalysis: (id: string) => apiRequest(`/api/analyses/${id}`, analysisDetailSchema),
  applyImprovement: (id: string) =>
    apiRequest(`/api/improvements/${id}/apply`, stagedImprovementSchema, { method: 'POST' }),
  discardImprovement: (id: string) =>
    apiRequest(`/api/improvements/${id}/discard`, stagedImprovementSchema, { method: 'POST' }),
};
