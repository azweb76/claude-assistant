import { Button, Stack, TextField, Typography } from '@mui/material';

export function StringListEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{label}</Typography>
      {value.map((item, index) => (
        <Stack direction="row" spacing={1} key={`${item}-${index}`}>
          <TextField
            size="small"
            fullWidth
            value={item}
            aria-label={`${label} item ${index + 1}`}
            onChange={(e) => {
              const next = [...value];
              next[index] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            aria-label={`Remove ${label} item ${index + 1}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </Stack>
      ))}
      <Button onClick={() => onChange([...value, ''])}>Add</Button>
    </Stack>
  );
}
