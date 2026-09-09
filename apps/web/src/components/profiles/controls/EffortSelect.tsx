import { MenuItem, TextField } from '@mui/material';
import type { Effort } from '@claude-assistant/shared';

export function EffortSelect({
  value,
  onChange,
}: {
  value: Effort;
  onChange: (value: Effort) => void;
}) {
  return (
    <TextField
      select
      label="Effort"
      value={value}
      onChange={(e) => onChange(e.target.value as Effort)}
      slotProps={{ htmlInput: { 'aria-label': 'Effort' } }}
    >
      {(['low', 'medium', 'high', 'xhigh', 'max'] as const).map((v) => (
        <MenuItem key={v} value={v}>
          {v}
        </MenuItem>
      ))}
    </TextField>
  );
}
