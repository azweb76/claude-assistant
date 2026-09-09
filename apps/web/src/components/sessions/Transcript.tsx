import { Box, Typography } from '@mui/material';

export function Transcript({
  messages,
}: {
  messages: Array<{ type: string; subtype?: string | null; payload?: unknown; seq?: number }>;
}) {
  return (
    <Box aria-label="Session transcript" sx={{ display: 'grid', gap: 1.5 }}>
      {messages.map((m, idx) => (
        <Box
          key={m.seq ?? idx}
          sx={(t) => ({
            p: 1.5,
            borderLeft: 3,
            borderColor: m.type.includes('tool') ? 'secondary.main' : 'primary.main',
            bgcolor: 'action.hover',
            ...t.applyStyles('dark', { bgcolor: 'action.selected' }),
          })}
        >
          <Typography variant="caption" color="text.secondary">
            {m.type}
            {m.subtype ? `/${m.subtype}` : ''}
          </Typography>
          <Typography
            component="pre"
            sx={{
              m: 0,
              whiteSpace: 'pre-wrap',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 13,
            }}
          >
            {typeof m.payload === 'string' ? m.payload : JSON.stringify(m.payload, null, 2)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export function UsageMeter({
  inputTokens,
  outputTokens,
  totalCostUsd,
  numTurns,
}: {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalCostUsd?: number | null;
  numTurns?: number | null;
}) {
  return (
    <Typography variant="body2" aria-label="Usage meter">
      Turns: {numTurns ?? '—'} · Tokens: {(inputTokens ?? 0) + (outputTokens ?? 0)} · Cost: $
      {(totalCostUsd ?? 0).toFixed(4)}
    </Typography>
  );
}
