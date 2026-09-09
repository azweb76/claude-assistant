import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api/endpoints.js';
import { ErrorState, LoadingState } from '../components/common/StateViews.js';

type Workspace = Awaited<ReturnType<typeof api.listWorkspaces>>[number];
type Profile = Awaited<ReturnType<typeof api.listProfiles>>[number];

export function NewSessionPage() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [profileId, setProfileId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([api.listWorkspaces(), api.listProfiles()])
      .then(([w, p]) => {
        setWorkspaces(w);
        setProfiles(p);
        if (w[0]) setWorkspaceId(w[0].id);
        if (p[0]) setProfileId(p[0].id);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Load failed'));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!workspaces || !profiles) return <LoadingState />;

  return (
    <Stack spacing={2} sx={{ maxWidth: 720 }}>
      <Typography variant="h4">New session</Typography>
      <TextField
        select
        label="Workspace"
        value={workspaceId}
        onChange={(e) => setWorkspaceId(e.target.value)}
        required
      >
        {workspaces.map((w) => (
          <MenuItem key={w.id} value={w.id}>
            {w.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Agent profile"
        value={profileId}
        onChange={(e) => setProfileId(e.target.value)}
        required
      >
        {profiles.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Prompt"
        multiline
        minRows={6}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        required
      />
      <Button
        variant="contained"
        aria-label="Start session"
        disabled={!workspaceId || !profileId || !prompt.trim()}
        onClick={() => {
          void api
            .createSession({ workspaceId, profileId, prompt: prompt.trim() })
            .then((session) => navigate(`/sessions/${session.id}`))
            .catch((err: unknown) =>
              setError(err instanceof Error ? err.message : 'Failed to start session'),
            );
        }}
      >
        Start session
      </Button>
    </Stack>
  );
}
