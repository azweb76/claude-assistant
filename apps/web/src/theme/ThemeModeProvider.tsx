import { type ReactNode } from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { appTheme } from './theme.js';

const STORAGE_KEY = 'claude-assistant.color-scheme';

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={appTheme} defaultMode="system" modeStorageKey={STORAGE_KEY}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
