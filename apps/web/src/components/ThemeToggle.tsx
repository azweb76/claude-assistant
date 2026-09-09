import { IconButton, MenuItem, Select } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useThemeMode, type ColorMode } from '../theme/useThemeMode.js';

export function ThemeToggle() {
  const { mode, setMode, resolved } = useThemeMode();
  return (
    <>
      <IconButton
        aria-label={`Color scheme is ${resolved}`}
        onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
        color="inherit"
      >
        {resolved === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
      <Select
        size="small"
        value={mode}
        aria-label="Color scheme mode"
        onChange={(e) => setMode(e.target.value as ColorMode)}
        sx={{ ml: 1, minWidth: 110, color: 'inherit' }}
      >
        <MenuItem value="light">Light</MenuItem>
        <MenuItem value="dark">Dark</MenuItem>
        <MenuItem value="system">System</MenuItem>
      </Select>
    </>
  );
}
