import { useColorScheme } from '@mui/material/styles';

export type ColorMode = 'light' | 'dark' | 'system';

export function useThemeMode() {
  const { mode, setMode, systemMode } = useColorScheme();
  return {
    mode: (mode ?? 'system') as ColorMode,
    setMode: (next: ColorMode) => setMode(next),
    resolved: (mode === 'system' ? systemMode : mode) ?? 'light',
  };
}
