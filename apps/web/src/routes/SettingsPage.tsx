import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { AppSettingsValues } from '@claude-assistant/shared';
import { api } from '../api/endpoints.js';
import { ApiClientError } from '../api/client.js';
import { ErrorState, LoadingState } from '../components/common/StateViews.js';

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettingsValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void api
      .getSettings()
      .then(setSettings)
      .catch((err: unknown) =>
        setError(err instanceof ApiClientError ? err.message : 'Failed to load settings'),
      );
  }, []);

  if (error) {
    return <ErrorState message={error} />;
  }
  if (!settings) {
    return <LoadingState label="Loading settings…" />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <TextField
          label="Managed clone directory"
          value={settings.managedCloneDir}
          onChange={(e) => setSettings({ ...settings, managedCloneDir: e.target.value })}
        />
        <TextField
          label="Analysis model"
          value={settings.analysisModel}
          onChange={(e) => setSettings({ ...settings, analysisModel: e.target.value })}
        />
        <TextField
          select
          label="Analysis effort"
          value={settings.analysisEffort}
          onChange={(e) =>
            setSettings({
              ...settings,
              analysisEffort: e.target.value as AppSettingsValues['analysisEffort'],
            })
          }
        >
          {['low', 'medium', 'high', 'xhigh', 'max'].map((v) => (
            <MenuItem key={v} value={v}>
              {v}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={
            <Checkbox
              checked={settings.allowBypassPermissions}
              onChange={(e) =>
                setSettings({ ...settings, allowBypassPermissions: e.target.checked })
              }
            />
          }
          label="Allow bypassPermissions"
        />
        <Button
          variant="contained"
          disabled={saving}
          aria-label="Save settings"
          onClick={() => {
            setSaving(true);
            setSaved(false);
            void api
              .updateSettings(settings)
              .then((next) => {
                setSettings(next);
                setSaved(true);
              })
              .catch((err: unknown) =>
                setError(err instanceof ApiClientError ? err.message : 'Save failed'),
              )
              .finally(() => setSaving(false));
          }}
        >
          Save
        </Button>
        {saved ? <Alert severity="success">Settings saved</Alert> : null}
      </Stack>
    </Box>
  );
}
