import type { SvgIconComponent } from '@mui/icons-material';
import BadgeIcon from '@mui/icons-material/Badge';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import RuleIcon from '@mui/icons-material/Rule';
import {
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

export const drawerWidth = 240;

type SidebarItem = {
  label: string;
  path: string;
  icon: SvgIconComponent;
};

const sidebarItems: SidebarItem[] = [
  { label: '員工管理', path: '/employees', icon: PeopleAltIcon },
  { label: '可上班時間', path: '/availability', icon: EventAvailableIcon },
  { label: '職位管理', path: '/positions', icon: BadgeIcon },
  { label: '班表管理', path: '/schedules', icon: CalendarMonthIcon },
  { label: '工時統計', path: '/labor-stats', icon: QueryStatsIcon },
  { label: '少編/超編檢查', path: '/staffing-check', icon: RuleIcon },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRightColor: 'divider',
        },
      }}
    >
      <Toolbar sx={{ px: 3 }}>
        <Typography variant="h6" noWrap>
          影院排班
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2 }}>
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const selected = pathname === item.path;

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                selected={selected}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}
