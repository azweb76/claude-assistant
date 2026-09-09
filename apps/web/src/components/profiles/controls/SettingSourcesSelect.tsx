import { Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel } from '@mui/material';

const sources = ['user', 'project', 'local'] as const;

export function SettingSourcesSelect({
  value,
  onChange,
}: {
  value: Array<'user' | 'project' | 'local'>;
  onChange: (value: Array<'user' | 'project' | 'local'>) => void;
}) {
  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">Setting sources</FormLabel>
      <FormGroup row>
        {sources.map((source) => (
          <FormControlLabel
            key={source}
            control={
              <Checkbox
                checked={value.includes(source)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...value, source]);
                  } else {
                    onChange(value.filter((v) => v !== source));
                  }
                }}
              />
            }
            label={source}
          />
        ))}
      </FormGroup>
    </FormControl>
  );
}
