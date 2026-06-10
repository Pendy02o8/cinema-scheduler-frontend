import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { employeeService } from '../services/employeeService';
import { monthlyLeaveService } from '../services/monthlyLeaveService';
import type { Employee } from '../types/employee';
import type { MonthlyLeave } from '../types/monthlyLeave';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const jobTitleOrder: Record<string, number> = {
  副理: 1,
  會計: 2,
  主任: 3,
  早班正職: 4,
  早班正職人員: 4,
  組長: 5,
  總務: 6,
  放映師: 7,
  晚班正職: 8,
  晚班正職人員: 8,
  正職清潔: 9,
  晚班清潔: 10,
};

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

function getCalendarCells(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const cells: Array<string | null> = Array.from({ length: firstDay.getDay() }, () => null);

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push(formatDateValue(new Date(year, month - 1, day)));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function formatEmployeeLabel(employee: Employee) {
  const shiftLabel =
    employee.fixedShiftType === 'MORNING'
      ? '早班'
      : employee.fixedShiftType === 'EVENING'
        ? '晚班'
        : '';

  return shiftLabel
    ? `${employee.name}（${employee.jobTitle}｜${shiftLabel}）`
    : `${employee.name}（${employee.jobTitle}）`;
}

function isMonthlyLeaveEligibleEmployee(employee: Employee) {
  return (
    employee.jobTitle !== '副理'
    && (employee.employeeType === 'FULL_TIME' || employee.employeeType === 'CLEANER')
  );
}

function sortEmployees(firstEmployee: Employee, secondEmployee: Employee) {
  const firstOrder = jobTitleOrder[firstEmployee.jobTitle] ?? 999;
  const secondOrder = jobTitleOrder[secondEmployee.jobTitle] ?? 999;

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return firstEmployee.id - secondEmployee.id;
}

function sortLeavesByEmployee(firstLeave: MonthlyLeave, secondLeave: MonthlyLeave) {
  return sortEmployees(firstLeave.employee, secondLeave.employee);
}

function getShiftColumnLeaves(leaves: MonthlyLeave[]) {
  const sortedLeaves = [...leaves].sort(sortLeavesByEmployee);

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
  const [selectedDateLeaves, setSelectedDateLeaves] = useState<MonthlyLeave[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSelectedDate, setLoadingSelectedDate] = useState(false);
  const [savingEmployeeIds, setSavingEmployeeIds] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const eligibleEmployees = useMemo(() => {
    return employees
      .filter(isMonthlyLeaveEligibleEmployee)
      .sort(sortEmployees);
  }, [employees]);

  const calendarCells = useMemo(() => getCalendarCells(monthValue), [monthValue]);

  const monthLeavesByDate = useMemo(() => {
    const groupedLeaves = new Map<string, MonthlyLeave[]>();

    monthLeaves.filter((leave) => isMonthlyLeaveEligibleEmployee(leave.employee)).forEach((leave) => {
      const leaves = groupedLeaves.get(leave.leaveDate) ?? [];
      leaves.push(leave);
      groupedLeaves.set(leave.leaveDate, leaves);
    });

    return groupedLeaves;
  }, [monthLeaves]);

  const selectedLeaveByEmployeeId = useMemo(() => {
    return new Map(selectedDateLeaves.map((leave) => [leave.employee.id, leave]));
  }, [selectedDateLeaves]);

  const loadMonthData = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError(null);

    try {
      const range = getMonthRange(targetMonth);
      const [employeeData, leaveData] = await Promise.all([
        employeeService.getEmployees(),
        monthlyLeaveService.getMonthlyLeavesByRange(range.startDate, range.endDate),
      ]);
      setEmployees(employeeData);
      setMonthLeaves(leaveData);
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
      setSelectedDateLeaves(leaves);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingSelectedDate(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMonthData(monthValue);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadMonthData, monthValue]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSelectedDateLeaves(selectedDate);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSelectedDateLeaves, selectedDate]);

  const handleMonthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextMonth = event.target.value;
    setMonthValue(nextMonth);
    setSelectedDate(getMonthRange(nextMonth).startDate);
  };

  const handleToggleLeave = async (employee: Employee, checked: boolean) => {
    const existingLeave = selectedLeaveByEmployeeId.get(employee.id);

    setSavingEmployeeIds((current) => new Set(current).add(employee.id));

    try {
      if (checked && !existingLeave) {
        const createdLeave = await monthlyLeaveService.createMonthlyLeave(employee.id, selectedDate);
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
            Monthly Leave Management
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Set monthly leave days for full-time and cleaning employees.
          </Typography>
        </Box>

        <TextField
          label="Month"
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
                      setSelectedDate(date);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (date && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      setSelectedDate(date);
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
                            {morningLeaves.map((leave) => (
                              <Typography
                                key={leave.id}
                                variant="body1"
                                color="primary.main"
                                noWrap
                                sx={{ minWidth: 0, lineHeight: 1.25 }}
                              >
                                {leave.employee.name}
                              </Typography>
                            ))}
                          </Stack>
                          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                            {eveningLeaves.map((leave) => (
                              <Typography
                                key={leave.id}
                                variant="body1"
                                color="primary.main"
                                noWrap
                                sx={{ minWidth: 0, lineHeight: 1.25 }}
                              >
                                {leave.employee.name}
                              </Typography>
                            ))}
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
                <Typography color="text.secondary">Loading monthly leaves...</Typography>
              </Stack>
            ) : null}

            <Stack spacing={0.5}>
              {eligibleEmployees.map((employee) => {
                const checked = selectedLeaveByEmployeeId.has(employee.id);
                const saving = savingEmployeeIds.has(employee.id);

                return (
                  <FormControlLabel
                    key={employee.id}
                    control={
                      <Checkbox
                        checked={checked}
                        disabled={saving || loadingSelectedDate}
                        onChange={(event) => void handleToggleLeave(employee, event.target.checked)}
                      />
                    }
                    label={formatEmployeeLabel(employee)}
                  />
                );
              })}
            </Stack>

            {!loading && eligibleEmployees.length === 0 ? (
              <Alert severity="info">No full-time or cleaning employees found.</Alert>
            ) : null}
          </Stack>
        </Paper>
      </Box>

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
