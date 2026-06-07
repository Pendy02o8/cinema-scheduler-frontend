import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar, { drawerWidth } from '../components/Sidebar';

const pageTitles: Record<string, string> = {
  '/employees': '員工管理',
  '/availability': '可上班時間',
  '/positions': '職位管理',
  '/schedules': '班表管理',
  '/labor-stats': '工時統計',
  '/staffing-check': '少編/超編檢查',
};

export default function MainLayout() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? '影院排班系統';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <Typography variant="h6" component="h1" noWrap>
            {title}
          </Typography>
        </Toolbar>
      </AppBar>
      <Sidebar />
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
