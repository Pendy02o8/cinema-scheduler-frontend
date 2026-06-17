import type { SvgIconComponent } from '@mui/icons-material';
import BadgeIcon from '@mui/icons-material/Badge';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import RuleIcon from '@mui/icons-material/Rule';
import SortIcon from '@mui/icons-material/Sort';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

export const drawerWidth = 240;
export const collapsedDrawerWidth = 72;

type SidebarItem = {
  label: string;
  path: string;
  icon: SvgIconComponent;
};

const sidebarItems: SidebarItem[] = [
  { label: '週排班管理', path: '/weekly-schedules', icon: CalendarMonthIcon },
  { label: '員工管理', path: '/employees', icon: PeopleAltIcon },
  { label: '班表排序', path: '/employee-sort-order', icon: SortIcon },
  { label: '崗位管理', path: '/positions', icon: BadgeIcon },
  { label: '月休管理', path: '/monthly-leaves', icon: EventBusyIcon },
  { label: '工讀生休假管理', path: '/availability', icon: EventAvailableIcon },
  { label: '工時統計', path: '/work-hour-statistics', icon: QueryStatsIcon },
  { label: '缺人檢查', path: '/understaffing-check', icon: RuleIcon },
  { label: '超編檢查', path: '/overstaffing-check', icon: WarningAmberIcon },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation();
  const currentDrawerWidth = collapsed ? collapsedDrawerWidth : drawerWidth;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: currentDrawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: currentDrawerWidth,
          boxSizing: 'border-box',
          borderRightColor: 'divider',
          overflowX: 'hidden',
          transition: (theme) =>
            theme.transitions.create('width', {
              duration: theme.transitions.duration.shorter,
              easing: theme.transitions.easing.easeInOut,
            }),
        },
      }}
    >
      <Toolbar
        sx={{
          px: collapsed ? 1 : 2,
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        {!collapsed ? (
          <Typography variant="h6" noWrap>
            影城排班
          </Typography>
        ) : null}
        <Tooltip title={collapsed ? '展開側邊欄' : '收合側邊欄'}>
          <IconButton aria-label={collapsed ? '展開側邊欄' : '收合側邊欄'} onClick={onToggle}>
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2 }}>
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const selected = pathname === item.path;

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={collapsed ? item.label : ''} placement="right">
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  selected={selected}
                  sx={{
                    borderRadius: 1,
                    minHeight: 44,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    px: collapsed ? 1 : 2,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 0 : 40,
                      justifyContent: 'center',
                    }}
                  >
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  {!collapsed ? <ListItemText primary={item.label} /> : null}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}
