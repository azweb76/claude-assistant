import { useState } from 'react';
import { Button, Stack, TextField, Typography } from '@mui/material';
import type { AgentProfile, AgentProfileCreate } from '@claude-assistant/shared';
import { EffortSelect } from './controls/EffortSelect.js';
import { PermissionModeSelect } from './controls/PermissionModeSelect.js';
import { SettingSourcesSelect } from './controls/SettingSourcesSelect.js';
import { StringListEditor } from './controls/StringListEditor.js';

const blank = (): AgentProfileCreate => ({
  name: '',
  model: 'claude-sonnet-4-20250514',
  effort: 'medium',
  permissionMode: 'acceptEdits',
  allowedTools: null,
  disallowedTools: null,
  skills: 'all',
  agents: null,
  settingSources: ['user', 'project'],
  maxTurns: 40,
  maxBudgetUsd: 5,
  extraSystemPrompt: '',
  isBuiltIn: false,
});

export function ProfileForm({
  initial,
  allowBypass,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<AgentProfile> &
    Pick<AgentProfile, 'name' | 'model' | 'effort' | 'permissionMode' | 'settingSources'>;
  allowBypass: boolean;
  onSubmit: (value: AgentProfileCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<AgentProfileCreate>({
    ...blank(),
    ...initial,
    isBuiltIn: false,
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <Stack
      spacing={2}
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        void onSubmit(value).catch((err: unknown) =>
          setError(err instanceof Error ? err.message : 'Save failed'),
        );
      }}
    >
      <TextField
        label="Name"
        required
        value={value.name}
        onChange={(e) => setValue({ ...value, name: e.target.value })}
      />
      <TextField
        label="Model"
        required
        value={value.model}
        onChange={(e) => setValue({ ...value, model: e.target.value })}
      />
      <EffortSelect value={value.effort} onChange={(effort) => setValue({ ...value, effort })} />
      <PermissionModeSelect
        value={value.permissionMode}
        allowBypass={allowBypass}
        onChange={(permissionMode) => setValue({ ...value, permissionMode })}
      />
      <SettingSourcesSelect
        value={value.settingSources}
        onChange={(settingSources) => setValue({ ...value, settingSources })}
      />
      <StringListEditor
        label="Allowed tools"
        value={value.allowedTools ?? []}
        onChange={(allowedTools) =>
          setValue({ ...value, allowedTools: allowedTools.length ? allowedTools : null })
        }
      />
      <StringListEditor
        label="Disallowed tools"
        value={value.disallowedTools ?? []}
        onChange={(disallowedTools) =>
          setValue({
            ...value,
            disallowedTools: disallowedTools.length ? disallowedTools : null,
          })
        }
      />
      <TextField
        label="Skills (comma-separated or 'all')"
        value={value.skills === 'all' ? 'all' : (value.skills ?? []).join(',')}
        onChange={(e) => {
          const raw = e.target.value.trim();
          setValue({
            ...value,
            skills: raw === 'all' ? 'all' : raw ? raw.split(',').map((s) => s.trim()) : null,
          });
        }}
      />
      <TextField
        label="Max turns"
        type="number"
        value={value.maxTurns ?? ''}
        onChange={(e) =>
          setValue({ ...value, maxTurns: e.target.value ? Number(e.target.value) : null })
        }
      />
      <TextField
        label="Max budget USD"
        type="number"
        value={value.maxBudgetUsd ?? ''}
        onChange={(e) =>
          setValue({ ...value, maxBudgetUsd: e.target.value ? Number(e.target.value) : null })
        }
      />
      <TextField
        label="Extra system prompt"
        multiline
        minRows={3}
        value={value.extraSystemPrompt ?? ''}
        onChange={(e) => setValue({ ...value, extraSystemPrompt: e.target.value })}
      />
      {error ? <Typography color="error">{error}</Typography> : null}
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained">
          Save
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Stack>
    </Stack>
  );
}
