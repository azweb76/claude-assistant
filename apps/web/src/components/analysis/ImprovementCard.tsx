import { Button, Stack, Typography } from '@mui/material';
import type { StagedImprovement } from '@claude-assistant/shared';

export function DiffView({ diff }: { diff: string }) {
  return (
    <Typography
      component="pre"
      aria-label="Improvement diff"
      sx={{
        m: 0,
        p: 1.5,
        overflow: 'auto',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 13,
        bgcolor: 'action.hover',
        whiteSpace: 'pre-wrap',
      }}
    >
      {diff || '(no diff)'}
    </Typography>
  );
}

export function ImprovementCard({
  item,
  onApply,
  onDiscard,
}: {
  item: Omit<StagedImprovement, 'status'> & { status?: StagedImprovement['status'] };
  onApply: () => Promise<void>;
  onDiscard: () => Promise<void>;
}) {
  const status = item.status ?? 'staged';
  return (
    <Stack spacing={1} sx={{ py: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Typography sx={{ fontWeight: 600 }}>
        {item.category} · {item.scope}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {item.targetPath}
      </Typography>
      <Typography>{item.rationale}</Typography>
      <DiffView diff={item.diff} />
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={status !== 'staged'}
          aria-label={`Apply improvement ${item.id}`}
          onClick={() => void onApply()}
        >
          {status === 'applied' ? 'Applied' : 'Apply'}
        </Button>
        <Button
          disabled={status !== 'staged'}
          aria-label={`Discard improvement ${item.id}`}
          onClick={() => void onDiscard()}
        >
          {status === 'discarded' ? 'Discarded' : 'Discard'}
        </Button>
      </Stack>
    </Stack>
  );
}
