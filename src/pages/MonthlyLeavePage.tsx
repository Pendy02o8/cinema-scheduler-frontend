import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { employeeService } from '../services/employeeService';
import { monthlyLeaveService } from '../services/monthlyLeaveService';
import type { Employee } from '../types/employee';
import type { LeaveType, MonthlyLeave, MonthlyLeaveSummary } from '../types/monthlyLeave';
import { getActiveEmployees } from '../utils/employeeFilters';
import { getFixedShiftLabel } from '../utils/employeeLabels';
import { sortEmployeesBySortOrder } from '../utils/employeeSort';
import {
  defaultLeaveType,
  getLeaveTypeLabel,
  leaveTypeOptions,
  normalizeLeaveType,
} from '../utils/leaveType';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

type MonthlyLeaveSummaryRow = MonthlyLeaveSummary & {
  regularLeaveDays: number;
  annualLeaveDays: number;
  totalLeaveDays: number;
  leaveDateLabels: string[];
};

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object'
    && error !== null
    && 'response' in error
    && typeof error.response === 'object'
    && error.response !== null
    && 'data' in error.response
  ) {
    const responseData = error.response.data;

    if (typeof responseData === 'string') {
      return responseData;
    }

    if (
      typeof responseData === 'object'
      && responseData !== null
      && 'message' in responseData
      && typeof responseData.message === 'string'
    ) {
      return responseData.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return {
    startDate: formatDateValue(startDate),
    endDate: formatDateValue(endDate),
  };
}

function getYearMonth(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);

  return { year, month };
}

function getCalendarCells(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const firstMondayIndex = (firstDay.getDay() + 6) % 7;
  const cells: Array<string | null> = Array.from({ length: firstMondayIndex }, () => null);

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push(formatDateValue(new Date(year, month - 1, day)));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function formatEmployeeLabel(employee: Employee) {
  const shiftLabel = getFixedShiftLabel(employee.fixedShiftType);

  return shiftLabel !== '-'
    ? `${employee.name}（${employee.jobTitle}｜${shiftLabel}）`
    : `${employee.name}（${employee.jobTitle}）`;
}

function formatSummaryDate(date: string) {
  const [, month, day] = date.split('-');

  if (!month || !day) {
    return date;
  }

  return `${month}/${day}`;
}

function formatSummaryLeaveDate(leave: MonthlyLeave) {
  return `${formatSummaryDate(leave.leaveDate)} (${getLeaveTypeLabel(
    leave.leaveType,
    'management',
  )})`;
}

function requiresMonthlyLeave(employee: Employee) {
  return employee.requiresMonthlyLeave === true;
}

function filterLeavesByEmployeeIds(leaves: MonthlyLeave[], employeeIds: Set<number>) {
  return leaves.filter((leave) => employeeIds.has(leave.employee.id));
}

function filterSummaryByEmployeeIds(summary: MonthlyLeaveSummary[], employeeIds: Set<number>) {
  return summary.filter((item) => employeeIds.has(item.employeeId));
}

function sortLeavesByEmployee(leaves: MonthlyLeave[]) {
  const employeeOrder = new Map(
    sortEmployeesBySortOrder(leaves.map((leave) => leave.employee))
      .map((employee, index) => [employee.id, index]),
  );

  return [...leaves].sort((firstLeave, secondLeave) => {
    const firstOrder = employeeOrder.get(firstLeave.employee.id) ?? Number.MAX_SAFE_INTEGER;
    const secondOrder = employeeOrder.get(secondLeave.employee.id) ?? Number.MAX_SAFE_INTEGER;

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }

    return firstLeave.id - secondLeave.id;
  });
}

function getShiftColumnLeaves(leaves: MonthlyLeave[]) {
  const sortedLeaves = sortLeavesByEmployee(leaves);

  return {
    morningLeaves: sortedLeaves.filter((leave) => leave.employee.fixedShiftType !== 'EVENING'),
    eveningLeaves: sortedLeaves.filter((leave) => leave.employee.fixedShiftType === 'EVENING'),
  };
}

export default function MonthlyLeavePage() {
  const [monthValue, setMonthValue] = useState(getCurrentMonthValue);
  const [selectedDate, setSelectedDate] = useState(() => getMonthRange(getCurrentMonthValue()).startDate);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [monthLeaves, setMonthLeaves] = useState<MonthlyLeave[]>([]);
  const [monthlyLeaveSummary, setMonthlyLeaveSummary] = useState<MonthlyLeaveSummary[]>([]);
  const [selectedDateLeaves, setSelectedDateLeaves] = useState<MonthlyLeave[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingSelectedDate, setLoadingSelectedDate] = useState(false);
  const [savingEmployeeIds, setSavingEmployeeIds] = useState<Set<number>>(() => new Set());
  const [leaveTypeSelections, setLeaveTypeSelections] = useState<Record<number, LeaveType>>({});
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const monthlyLeaveEmployees = useMemo(() => {
    return sortEmployeesBySortOrder(employees.filter(requiresMonthlyLeave));
  }, [employees]);

  const calendarCells = useMemo(() => getCalendarCells(monthValue), [monthValue]);

  const monthLeavesByDate = useMemo(() => {
    const groupedLeaves = new Map<string, MonthlyLeave[]>();

    monthLeaves.filter((leave) => requiresMonthlyLeave(leave.employee)).forEach((leave) => {
      const leaves = groupedLeaves.get(leave.leaveDate) ?? [];
      leaves.push(leave);
      groupedLeaves.set(leave.leaveDate, leaves);
    });

    return groupedLeaves;
  }, [monthLeaves]);

  const selectedLeaveByEmployeeId = useMemo(() => {
    return new Map(selectedDateLeaves.map((leave) => [leave.employee.id, leave]));
  }, [selectedDateLeaves]);

  const monthlyLeaveSummaryRows = useMemo<MonthlyLeaveSummaryRow[]>(() => {
    const leavesByEmployeeId = new Map<number, MonthlyLeave[]>();

    monthLeaves.forEach((leave) => {
      const leaves = leavesByEmployeeId.get(leave.employee.id) ?? [];
      leaves.push(leave);
      leavesByEmployeeId.set(leave.employee.id, leaves);
    });

    return monthlyLeaveSummary.map((summary) => {
      const leaves = [...(leavesByEmployeeId.get(summary.employeeId) ?? [])].sort(
        (firstLeave, secondLeave) => firstLeave.leaveDate.localeCompare(secondLeave.leaveDate),
      );
      const regularLeaveDays = leaves.length > 0
        ? leaves.filter((leave) => normalizeLeaveType(leave.leaveType) === 'REGULAR_LEAVE').length
        : summary.regularLeaveDays ?? summary.leaveDays;
      const annualLeaveDays = leaves.length > 0
        ? leaves.filter((leave) => normalizeLeaveType(leave.leaveType) === 'ANNUAL_LEAVE').length
        : summary.annualLeaveDays ?? 0;
      const totalLeaveDays = leaves.length > 0
        ? regularLeaveDays + annualLeaveDays
        : summary.totalLeaveDays ?? regularLeaveDays + annualLeaveDays;
      const leaveDateLabels = leaves.length > 0
        ? leaves.map(formatSummaryLeaveDate)
        : summary.leaveDates.map(formatSummaryDate);

      return {
        ...summary,
        regularLeaveDays,
        annualLeaveDays,
        totalLeaveDays,
        leaveDateLabels,
      };
    });
  }, [monthLeaves, monthlyLeaveSummary]);

  const loadMonthData = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError(null);

    try {
      const range = getMonthRange(targetMonth);
      const [employeeData, leaveData] = await Promise.all([
        employeeService.getEmployees(),
        monthlyLeaveService.getMonthlyLeavesByRange(range.startDate, range.endDate),
      ]);
      const activeEmployees = getActiveEmployees(employeeData);
      const activeEmployeeIds = new Set(activeEmployees.map((employee) => employee.id));

      setEmployees(activeEmployees);
      setMonthLeaves(filterLeavesByEmployeeIds(leaveData, activeEmployeeIds));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSelectedDateLeaves = useCallback(async (date: string) => {
    setLoadingSelectedDate(true);
    setError(null);

    try {
      const leaves = await monthlyLeaveService.getMonthlyLeavesByRange(date, date);
      setSelectedDateLeaves(leaves.filter((leave) => leave.employee.isActive));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingSelectedDate(false);
    }
  }, []);

  const loadMonthlyLeaveSummary = useCallback(async (targetMonth: string) => {
    setLoadingSummary(true);
    setSummaryError(null);

    try {
      const { year, month } = getYearMonth(targetMonth);
      const [employeeData, summary] = await Promise.all([
        employeeService.getEmployees(),
        monthlyLeaveService.getMonthlyLeaveSummary(year, month),
      ]);
      const activeEmployeeIds = new Set(
        getActiveEmployees(employeeData).map((employee) => employee.id),
      );

      setMonthlyLeaveSummary(filterSummaryByEmployeeIds(summary, activeEmployeeIds));
    } catch (loadError) {
      setSummaryError(getErrorMessage(loadError));
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMonthData(monthValue);
      void loadMonthlyLeaveSummary(monthValue);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadMonthData, loadMonthlyLeaveSummary, monthValue]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSelectedDateLeaves(selectedDate);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSelectedDateLeaves, selectedDate]);

  const handleSelectedDateChange = (date: string) => {
    setSelectedDate(date);
    setLeaveTypeSelections({});
  };

  const handleMonthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextMonth = event.target.value;
    setMonthValue(nextMonth);
    handleSelectedDateChange(getMonthRange(nextMonth).startDate);
  };

  const handleToggleLeave = async (employee: Employee, checked: boolean) => {
    const existingLeave = selectedLeaveByEmployeeId.get(employee.id);
    const selectedLeaveType = leaveTypeSelections[employee.id] ?? defaultLeaveType;

    setSavingEmployeeIds((current) => new Set(current).add(employee.id));

    try {
      if (checked && !existingLeave) {
        const createdLeave = await monthlyLeaveService.createMonthlyLeave(
          employee.id,
          selectedDate,
          selectedLeaveType,
        );
        setSelectedDateLeaves((current) => [...current, createdLeave]);
        setMonthLeaves((current) => [...current, createdLeave]);
      }

      if (!checked && existingLeave) {
        await monthlyLeaveService.deleteMonthlyLeave(existingLeave.id);
        setSelectedDateLeaves((current) =>
          current.filter((leave) => leave.id !== existingLeave.id),
        );
        setMonthLeaves((current) => current.filter((leave) => leave.id !== existingLeave.id));
      }

      setSnackbar({
        open: true,
        message: '月休已更新',
        severity: 'success',
      });
      await loadMonthlyLeaveSummary(monthValue);
    } catch (saveError) {
      setSnackbar({
        open: true,
        message: getErrorMessage(saveError),
        severity: 'error',
      });
    } finally {
      setSavingEmployeeIds((current) => {
        const next = new Set(current);
        next.delete(employee.id);
        return next;
      });
    }
  };

  const replaceMonthlyLeave = (updatedLeave: MonthlyLeave) => {
    setSelectedDateLeaves((current) =>
      current.map((leave) => (leave.id === updatedLeave.id ? updatedLeave : leave)),
    );
    setMonthLeaves((current) =>
      current.map((leave) => (leave.id === updatedLeave.id ? updatedLeave : leave)),
    );
  };

  const handleLeaveTypeChange = async (employee: Employee, leaveType: LeaveType) => {
    const existingLeave = selectedLeaveByEmployeeId.get(employee.id);

    setLeaveTypeSelections((current) => ({
      ...current,
      [employee.id]: leaveType,
    }));

    if (!existingLeave || normalizeLeaveType(existingLeave.leaveType) === leaveType) {
      return;
    }

    setSavingEmployeeIds((current) => new Set(current).add(employee.id));

    try {
      const updatedLeave = await monthlyLeaveService.updateMonthlyLeave(existingLeave.id, {
        employeeId: employee.id,
        leaveDate: existingLeave.leaveDate,
        leaveType,
        note: existingLeave.note,
      });
      replaceMonthlyLeave(updatedLeave);
      setSnackbar({
        open: true,
        message: '假別已更新',
        severity: 'success',
      });
      await loadMonthlyLeaveSummary(monthValue);
    } catch (saveError) {
      setSnackbar({
        open: true,
        message: getErrorMessage(saveError),
        severity: 'error',
      });
    } finally {
      setSavingEmployeeIds((current) => {
        const next = new Set(current);
        next.delete(employee.id);
        return next;
      });
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h4" component="h2">
            月休管理
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            設定需要月休管理員工的月休日期。
          </Typography>
        </Box>

        <TextField
          label="月份"
          type="month"
          value={monthValue}
          onChange={handleMonthChange}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: '100%', sm: 220 } }}
        />
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 360px' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(88px, 1fr))',
              borderBottom: 1,
              borderColor: 'divider',
              overflowX: 'auto',
            }}
          >
            {weekdayLabels.map((weekday) => (
              <Box
                key={weekday}
                sx={{
                  px: 1,
                  py: 1,
                  bgcolor: 'grey.100',
                  borderRight: 1,
                  borderColor: 'divider',
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              >
                {weekday}
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(88px, 1fr))',
              overflowX: 'auto',
            }}
          >
            {calendarCells.map((date, index) => {
              const leaves = date ? monthLeavesByDate.get(date) ?? [] : [];
              const { morningLeaves, eveningLeaves } = getShiftColumnLeaves(leaves);
              const selected = date === selectedDate;

              return (
                <Box
                  key={date ?? `empty-${index}`}
                  role={date ? 'button' : undefined}
                  tabIndex={date ? 0 : undefined}
                  onClick={() => {
                    if (date) {
                      handleSelectedDateChange(date);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (date && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      handleSelectedDateChange(date);
                    }
                  }}
                  sx={{
                    minHeight: 96,
                    p: 1,
                    borderRight: 1,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: selected ? 'primary.50' : date ? 'background.paper' : 'grey.50',
                    cursor: date ? 'pointer' : 'default',
                    outline: selected ? 2 : 0,
                    outlineColor: 'primary.main',
                    outlineOffset: -2,
                    '&:hover': date ? { bgcolor: selected ? 'primary.50' : 'grey.50' } : undefined,
                  }}
                >
                  {date ? (
                    <Stack spacing={0.5}>
                      <Typography sx={{ fontWeight: 700 }}>{Number(date.slice(8, 10))}</Typography>
                      {leaves.length > 0 ? (
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            columnGap: 0.75,
                            alignItems: 'start',
                          }}
                        >
                          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                            {morningLeaves.map((leave) => {
                              const annualLeave =
                                normalizeLeaveType(leave.leaveType) === 'ANNUAL_LEAVE';

                              return (
                                <Typography
                                  key={leave.id}
                                  variant="body1"
                                  noWrap
                                  style={{
                                    color: annualLeave ? '#d32f2f' : undefined,
                                    fontWeight: annualLeave ? 700 : undefined,
                                  }}
                                  sx={{ minWidth: 0, lineHeight: 1.25 }}
                                >
                                  {leave.employee.name}
                                </Typography>
                              );
                            })}
                          </Stack>
                          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                            {eveningLeaves.map((leave) => {
                              const annualLeave =
                                normalizeLeaveType(leave.leaveType) === 'ANNUAL_LEAVE';

                              return (
                                <Typography
                                  key={leave.id}
                                  variant="body1"
                                  noWrap
                                  style={{
                                    color: annualLeave ? '#d32f2f' : undefined,
                                    fontWeight: annualLeave ? 700 : undefined,
                                  }}
                                  sx={{ minWidth: 0, lineHeight: 1.25 }}
                                >
                                  {leave.employee.name}
                                </Typography>
                              );
                            })}
                          </Stack>
                        </Box>
                      ) : null}
                    </Stack>
                  ) : null}
                </Box>
              );
            })}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" component="h3">
                休假設定區
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {selectedDate}
              </Typography>
            </Box>

            {loading || loadingSelectedDate ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CircularProgress size={18} />
                <Typography color="text.secondary">載入月休資料中...</Typography>
              </Stack>
            ) : null}

            <Stack spacing={0.5}>
              {monthlyLeaveEmployees.map((employee) => {
                const existingLeave = selectedLeaveByEmployeeId.get(employee.id);
                const checked = Boolean(existingLeave);
                const saving = savingEmployeeIds.has(employee.id);
                const selectedLeaveType = normalizeLeaveType(
                  existingLeave?.leaveType ?? leaveTypeSelections[employee.id],
                );

                return (
                  <Stack
                    key={employee.id}
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checked}
                          disabled={saving || loadingSelectedDate}
                          onChange={(event) =>
                            void handleToggleLeave(employee, event.target.checked)}
                        />
                      }
                      label={formatEmployeeLabel(employee)}
                    />
                    <FormControl size="small" sx={{ minWidth: 96 }}>
                      <InputLabel id={`leave-type-${employee.id}`}>假別</InputLabel>
                      <Select
                        labelId={`leave-type-${employee.id}`}
                        label="假別"
                        value={selectedLeaveType}
                        disabled={saving || loadingSelectedDate}
                        onChange={(event) =>
                          void handleLeaveTypeChange(
                            employee,
                            normalizeLeaveType(event.target.value),
                          )}
                      >
                        {leaveTypeOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                );
              })}
            </Stack>

            {!loading && monthlyLeaveEmployees.length === 0 ? (
              <Alert severity="info">目前沒有需要月休管理的員工。</Alert>
            ) : null}
          </Stack>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Stack spacing={2} sx={{ p: 2 }}>
          <Box>
            <Typography variant="h6" component="h3">
              月休統計
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {monthValue}
            </Typography>
          </Box>

          {summaryError ? <Alert severity="error">{summaryError}</Alert> : null}

          {loadingSummary ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">載入月休統計中...</Typography>
            </Stack>
          ) : null}
        </Stack>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>姓名</TableCell>
                <TableCell>職稱</TableCell>
                <TableCell>月休</TableCell>
                <TableCell>特休</TableCell>
                <TableCell>總休假</TableCell>
                <TableCell>休假日期</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loadingSummary && monthlyLeaveSummaryRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    目前沒有可統計的月休資料
                  </TableCell>
                </TableRow>
              ) : null}

              {monthlyLeaveSummaryRows.map((summary) => (
                <TableRow key={summary.employeeId} hover>
                  <TableCell>{summary.employeeName}</TableCell>
                  <TableCell>{summary.jobTitle}</TableCell>
                  <TableCell>{summary.regularLeaveDays} 天</TableCell>
                  <TableCell>{summary.annualLeaveDays} 天</TableCell>
                  <TableCell>{summary.totalLeaveDays} 天</TableCell>
                  <TableCell>
                    {summary.leaveDateLabels.length > 0
                      ? summary.leaveDateLabels.join('、')
                      : '尚無休假'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
