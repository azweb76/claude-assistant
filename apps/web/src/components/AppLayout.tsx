import { useState, type ReactNode } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { ThemeToggle } from './ThemeToggle.js';

const navItems = [
  { to: '/workspaces', label: 'Workspaces' },
  { to: '/profiles', label: 'Profiles' },
  { to: '/sessions', label: 'Sessions' },
  { to: '/sessions/new', label: 'New session' },
  { to: '/analysis', label: 'Analysis' },
  { to: '/settings', label: 'Settings' },
];

const drawerWidth = 240;

export function AppLayout({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const drawer = (
    <List aria-label="Primary navigation">
      {navItems.map((item) => (
        <ListItemButton
          key={item.to}
          component={RouterLink}
          to={item.to}
          selected={location.pathname === item.to || location.pathname.startsWith(item.to + '/')}
          onClick={() => setOpen(false)}
        >
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={(t) => ({
          borderBottom: `1px solid ${t.palette.divider}`,
          backdropFilter: 'blur(8px)',
          ...t.applyStyles('dark', {
            backgroundImage: 'linear-gradient(180deg, #13201Dcc, #0B1211aa)',
          }),
          ...t.applyStyles('light', {
            backgroundImage: 'linear-gradient(180deg, #fffffff2, #F8FAF9cc)',
          }),
        })}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontFamily: 'IBM Plex Serif, serif' }}
          >
            claude-assistant
          </Typography>
          <ThemeToggle />
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        {isMobile ? (
          <Drawer open={open} onClose={() => setOpen(false)}>
            <Toolbar />
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            open
            sx={{
              '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
            }}
          >
            <Toolbar />
            {drawer}
          </Drawer>
        )}
      </Box>
      <Box
        component="main"
        sx={(t) => ({
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ...t.applyStyles('light', {
            backgroundImage: 'radial-gradient(circle at top left, #e7f5f2 0%, transparent 45%)',
          }),
          ...t.applyStyles('dark', {
            backgroundImage: 'radial-gradient(circle at top left, #16352f 0%, transparent 40%)',
          }),
        })}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
