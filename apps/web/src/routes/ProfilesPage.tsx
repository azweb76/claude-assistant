import { useEffect, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { api } from '../api/endpoints.js';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews.js';
import { ProfileForm } from '../components/profiles/ProfileForm.js';

type Profile = Awaited<ReturnType<typeof api.listProfiles>>[number];

export function ProfilesPage() {
  const [items, setItems] = useState<Profile[] | null>(null);
  const [allowBypass, setAllowBypass] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = () =>
    Promise.all([api.listProfiles(), api.getSettings()])
      .then(([profiles, settings]) => {
        setItems(profiles);
        setAllowBypass(settings.allowBypassPermissions);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Load failed'));

  useEffect(() => {
    void reload();
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!items) return <LoadingState label="Loading profiles…" />;

  if (creating || editing) {
    return (
      <ProfileForm
        initial={editing ?? undefined}
        allowBypass={allowBypass}
        onCancel={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={async (value) => {
          if (editing) {
            await api.updateProfile(editing.id, value);
          } else {
            await api.createProfile(value);
          }
          setCreating(false);
          setEditing(null);
          await reload();
        }}
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h4">Agent profiles</Typography>
        <Button variant="contained" aria-label="New profile" onClick={() => setCreating(true)}>
          New profile
        </Button>
      </Stack>
      {items.length === 0 ? (
        <EmptyState title="No profiles" description="Create an agent profile to run sessions." />
      ) : (
        items.map((p) => (
          <Stack
            key={p.id}
            direction="row"
            sx={{
              justifyContent: 'space-between',
              py: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <div>
              <Typography sx={{ fontWeight: 600 }}>
                {p.name} {p.isBuiltIn ? '(built-in)' : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {p.model} · {p.effort} · {p.permissionMode}
              </Typography>
            </div>
            <Stack direction="row" spacing={1}>
              <Button
                onClick={() => {
                  void api
                    .createProfile({
                      ...p,
                      name: `${p.name} copy`,
                      isBuiltIn: false,
                    })
                    .then(reload);
                }}
              >
                Duplicate
              </Button>
              {!p.isBuiltIn && (
                <>
                  <Button onClick={() => setEditing(p)}>Edit</Button>
                  <Button color="error" onClick={() => void api.deleteProfile(p.id).then(reload)}>
                    Delete
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        ))
      )}
    </Stack>
  );
}
