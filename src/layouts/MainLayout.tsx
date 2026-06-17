import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { collapsedDrawerWidth, drawerWidth } from '../components/Sidebar';

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const currentDrawerWidth = sidebarCollapsed ? collapsedDrawerWidth : drawerWidth;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: `calc(100% - ${currentDrawerWidth}px)`,
          ml: `${currentDrawerWidth}px`,
          borderBottom: 1,
          borderColor: 'divider',
          transition: (theme) =>
            theme.transitions.create(['width', 'margin-left'], {
              duration: theme.transitions.duration.shorter,
              easing: theme.transitions.easing.easeInOut,
            }),
        }}
      >
        <Toolbar>
          <Typography variant="h6" component="h1" noWrap>
            影城排班系統
          </Typography>
        </Toolbar>
      </AppBar>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: 3,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
