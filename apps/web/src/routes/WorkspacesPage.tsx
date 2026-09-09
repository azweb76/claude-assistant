import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Workspace } from '@claude-assistant/shared';
import { api } from '../api/endpoints.js';
import { ApiClientError } from '../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews.js';

export function WorkspacesPage() {
  const [items, setItems] = useState<Workspace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = () =>
    api
      .listWorkspaces()
      .then(setItems)
      .catch((err: unknown) =>
        setError(err instanceof ApiClientError ? err.message : 'Failed to load workspaces'),
      );

  useEffect(() => {
    void reload();
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!items) return <LoadingState />;

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Workspaces</Typography>
        <Button variant="contained" aria-label="Add workspace" onClick={() => setOpen(true)}>
          Add workspace
        </Button>
      </Stack>
      {items.length === 0 ? (
        <EmptyState
          title="No workspaces yet"
          description="Add a GitHub repository to get started."
        />
      ) : (
        items.map((w) => (
          <Stack
            key={w.id}
            direction={{ xs: 'column', sm: 'row' }}
            sx={{
              justifyContent: 'space-between',
              py: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <div>
              <Typography sx={{ fontWeight: 600 }}>{w.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {w.remote} · {w.defaultBranch}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {w.localPath}
              </Typography>
            </div>
            <Button
              color="error"
              aria-label={`Remove workspace ${w.name}`}
              onClick={() => {
                if (confirm(`Remove ${w.name}?`)) {
                  void api.deleteWorkspace(w.id).then(reload);
                }
              }}
            >
              Remove
            </Button>
          </Stack>
        ))
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add workspace</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Repository (owner/name or URL)"
            fullWidth
            value={ref}
            onChange={(e) => setRef(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={busy || !ref.trim()}
            onClick={() => {
              setBusy(true);
              setError(null);
              void api
                .createWorkspace(ref.trim())
                .then(() => {
                  setOpen(false);
                  setRef('');
                  return reload();
                })
                .catch((err: unknown) =>
                  setError(err instanceof ApiClientError ? err.message : 'Add failed'),
                )
                .finally(() => setBusy(false));
            }}
          >
            {busy ? 'Cloning…' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
