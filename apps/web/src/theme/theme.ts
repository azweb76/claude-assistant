import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data',
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#0F766E' },
        secondary: { main: '#B45309' },
        background: { default: '#F8FAF9', paper: '#FFFFFF' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#2DD4BF' },
        secondary: { main: '#FBBF24' },
        background: { default: '#0B1211', paper: '#13201D' },
      },
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    h1: { fontFamily: '"IBM Plex Serif", Georgia, serif', fontWeight: 600 },
    h2: { fontFamily: '"IBM Plex Serif", Georgia, serif', fontWeight: 600 },
    h4: { fontFamily: '"IBM Plex Serif", Georgia, serif', fontWeight: 600 },
    h5: { fontFamily: '"IBM Plex Serif", Georgia, serif', fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
});
