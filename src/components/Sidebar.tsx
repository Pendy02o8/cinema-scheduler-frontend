import type { SvgIconComponent } from '@mui/icons-material';
import BadgeIcon from '@mui/icons-material/Badge';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import RuleIcon from '@mui/icons-material/Rule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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
  { label: 'Employee Management', path: '/employees', icon: PeopleAltIcon },
  { label: 'Availability Management', path: '/availability', icon: EventAvailableIcon },
  { label: 'Position Management', path: '/positions', icon: BadgeIcon },
  { label: 'Weekly Schedule Management', path: '/weekly-schedules', icon: CalendarMonthIcon },
  { label: 'Monthly Leave Management', path: '/monthly-leaves', icon: EventBusyIcon },
  { label: 'Work Hour Statistics', path: '/work-hour-statistics', icon: QueryStatsIcon },
  { label: 'Understaffing Check', path: '/understaffing-check', icon: RuleIcon },
  { label: 'Overstaffing Check', path: '/overstaffing-check', icon: WarningAmberIcon },
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
          Cinema Scheduler
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
