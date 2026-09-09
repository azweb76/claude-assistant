import { z } from 'zod';
import { effortSchema, settingSourceSchema } from './agentProfile.js';

export const appSettingsValuesSchema = z.object({
  managedCloneDir: z.string().min(1),
  defaultProfileId: z.string().uuid().nullable(),
  defaultSettingSources: z.array(settingSourceSchema).min(1),
  analysisModel: z.string().min(1),
  analysisEffort: effortSchema,
  allowBypassPermissions: z.boolean(),
});

export type AppSettingsValues = z.infer<typeof appSettingsValuesSchema>;

export const APP_SETTINGS_DEFAULTS: AppSettingsValues = {
  managedCloneDir: '~/.claude-assistant/workspaces',
  defaultProfileId: null,
  defaultSettingSources: ['user', 'project'],
  analysisModel: 'claude-sonnet-4-20250514',
  analysisEffort: 'high',
  allowBypassPermissions: false,
};

export const appSettingKeySchema = z.enum([
  'managedCloneDir',
  'defaultProfileId',
  'defaultSettingSources',
  'analysisModel',
  'analysisEffort',
  'allowBypassPermissions',
]);

export type AppSettingKey = z.infer<typeof appSettingKeySchema>;
