import { Alert, Box, CircularProgress, Typography } from '@mui/material';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{ display: 'flex', gap: 2, alignItems: 'center', py: 4 }}
    >
      <CircularProgress size={24} />
      <Typography>{label}</Typography>
    </Box>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Box sx={{ py: 6 }}>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      {description ? <Typography color="text.secondary">{description}</Typography> : null}
    </Box>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Alert severity="error" role="alert" sx={{ my: 2 }}>
      {message}
    </Alert>
  );
}
