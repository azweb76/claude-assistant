import { Button, Stack, TextField } from '@mui/material';

export function RunControls({
  running,
  onCancel,
  onFollowUp,
}: {
  running: boolean;
  onCancel: () => void;
  onFollowUp: (prompt: string) => void;
}) {
  return (
    <Stack spacing={1}>
      {running ? (
        <Button color="warning" aria-label="Cancel session" onClick={onCancel}>
          Cancel
        </Button>
      ) : (
        <TextField
          label="Follow-up prompt"
          fullWidth
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              const value = (e.target as HTMLInputElement).value.trim();
              if (value) onFollowUp(value);
            }
          }}
        />
      )}
    </Stack>
  );
}
