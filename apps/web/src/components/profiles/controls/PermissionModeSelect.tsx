import { MenuItem, TextField } from '@mui/material';
import type { PermissionMode } from '@claude-assistant/shared';

const modes: PermissionMode[] = ['default', 'acceptEdits', 'bypassPermissions', 'plan'];

export function PermissionModeSelect({
  value,
  allowBypass,
  onChange,
}: {
  value: PermissionMode;
  allowBypass: boolean;
  onChange: (value: PermissionMode) => void;
}) {
  return (
    <TextField
      select
      label="Permission mode"
      value={value}
      onChange={(e) => onChange(e.target.value as PermissionMode)}
      slotProps={{ htmlInput: { 'aria-label': 'Permission mode' } }}
      helperText={!allowBypass ? 'bypassPermissions disabled in settings' : undefined}
    >
      {modes.map((v) => (
        <MenuItem key={v} value={v} disabled={v === 'bypassPermissions' && !allowBypass}>
          {v}
        </MenuItem>
      ))}
    </TextField>
  );
}
