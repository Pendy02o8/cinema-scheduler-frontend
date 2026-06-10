import CalculateIcon from '@mui/icons-material/Calculate';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { employeeService } from '../services/employeeService';
import { weeklyScheduleService } from '../services/weeklyScheduleService';
import { workHourService } from '../services/workHourService';
import type { Employee } from '../types/employee';
import type { WeeklySchedule } from '../types/weeklySchedule';
import type {
  SingleEmployeeWorkHourSummary,
  WorkHourSummary,
} from '../types/workHour';

type QueryMode = 'all' | 'employee';

type QueryFormValues = {
  mode: QueryMode;
  employeeId: string;
  weeklyScheduleId: string;
  startDate: string;
  endDate: string;
};

const emptySummary: SingleEmployeeWorkHourSummary | null = null;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

function getMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function LaborStatsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [allSummaries, setAllSummaries] = useState<WorkHourSummary[]>([]);
  const [employeeSummary, setEmployeeSummary] =
    useState<SingleEmployeeWorkHourSummary | null>(emptySummary);
  const [loading, setLoading] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<QueryFormValues>({
    mode: 'all',
    employeeId: '',
    weeklyScheduleId: '',
    startDate: getMonthStart(),
    endDate: getToday(),
  });

  const loadReferenceData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [employeeData, weeklyScheduleData] = await Promise.all([
        employeeService.getEmployees(),
        weeklyScheduleService.getWeeklySchedules(),
      ]);
      setEmployees(employeeData);
      setWeeklySchedules(weeklyScheduleData);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReferenceData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadReferenceData]);

  const handleDateChange =
    (field: keyof Pick<QueryFormValues, 'startDate' | 'endDate'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!formValues.startDate || !formValues.endDate) {
      setError('Start date and end date are required.');
      return;
    }

    if (formValues.startDate > formValues.endDate) {
      setError('Start date cannot be after end date.');
      return;
    }

    if (formValues.mode === 'employee' && !formValues.employeeId) {
      setError('Employee is required when querying a single employee.');
      return;
    }

    setQuerying(true);
    setError(null);

    try {
      const query = {
        startDate: formValues.startDate,
        endDate: formValues.endDate,
      };

      if (formValues.mode === 'employee') {
        const summary = await workHourService.getEmployeeSummary(
          Number(formValues.employeeId),
          query,
        );
        setEmployeeSummary(summary);
        setAllSummaries([]);
      } else {
        const summaries = await workHourService.getAllSummaries(query);
        setAllSummaries(summaries);
        setEmployeeSummary(null);
      }
    } catch (queryError) {
      setError(getErrorMessage(queryError));
    } finally {
      setQuerying(false);
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
            Work Hour Statistics
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Query employee work hour summaries by date range.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => void loadReferenceData()}
          disabled={loading || querying}
        >
          Refresh Data
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
          >
            <FormControl sx={{ minWidth: { xs: '100%', md: 260 } }}>
              <InputLabel id="work-hour-week-label">Weekly Schedule</InputLabel>
              <Select
                labelId="work-hour-week-label"
                label="Weekly Schedule"
                value={formValues.weeklyScheduleId}
                onChange={(event) => {
                  const weeklyScheduleId = event.target.value;
                  const weeklySchedule = weeklySchedules.find(
                    (schedule) => String(schedule.id) === weeklyScheduleId,
                  );

                  setFormValues((current) => ({
                    ...current,
                    weeklyScheduleId,
                    startDate: weeklySchedule?.weekStartDate ?? current.startDate,
                    endDate: weeklySchedule?.weekEndDate ?? current.endDate,
                  }));
                }}
              >
                <MenuItem value="">Custom Date Range</MenuItem>
                {weeklySchedules.map((schedule) => (
                  <MenuItem key={schedule.id} value={String(schedule.id)}>
                    {schedule.weekStartDate} to {schedule.weekEndDate}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: { xs: '100%', md: 180 } }}>
              <InputLabel id="work-hour-mode-label">Scope</InputLabel>
              <Select
                labelId="work-hour-mode-label"
                label="Scope"
                value={formValues.mode}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    mode: event.target.value as QueryMode,
                  }))
                }
              >
                <MenuItem value="all">All Employees</MenuItem>
                <MenuItem value="employee">Single Employee</MenuItem>
              </Select>
            </FormControl>

            <FormControl
              disabled={formValues.mode === 'all'}
              required={formValues.mode === 'employee'}
              sx={{ minWidth: { xs: '100%', md: 260 } }}
            >
              <InputLabel id="work-hour-employee-label">Employee</InputLabel>
              <Select
                labelId="work-hour-employee-label"
                label="Employee"
                value={formValues.employeeId}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    employeeId: event.target.value,
                  }))
                }
              >
                {employees.map((employee) => (
                  <MenuItem key={employee.id} value={String(employee.id)}>
                    {employee.id} - {employee.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Start Date"
              type="date"
              value={formValues.startDate}
              onChange={handleDateChange('startDate')}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="End Date"
              type="date"
              value={formValues.endDate}
              onChange={handleDateChange('endDate')}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Button
              type="submit"
              variant="contained"
              startIcon={<CalculateIcon />}
              disabled={querying || loading}
              sx={{ minWidth: 140 }}
            >
              {querying ? 'Querying...' : 'Query'}
            </Button>
          </Stack>
        </Box>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Period</TableCell>
              <TableCell align="right">Hours</TableCell>
              <TableCell>Backend Summary</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {formValues.mode === 'all'
              ? allSummaries.map((summary) => (
                  <TableRow key={summary.rawText} hover>
                    <TableCell>{summary.employeeName}</TableCell>
                    <TableCell>
                      {formValues.startDate} to {formValues.endDate}
                    </TableCell>
                    <TableCell align="right">{summary.hours}</TableCell>
                    <TableCell>{summary.rawText}</TableCell>
                  </TableRow>
                ))
              : null}

            {formValues.mode === 'employee' && employeeSummary ? (
              <TableRow hover>
                <TableCell>{employeeSummary.employeeName}</TableCell>
                <TableCell>
                  {employeeSummary.startDate || formValues.startDate} to{' '}
                  {employeeSummary.endDate || formValues.endDate}
                </TableCell>
                <TableCell align="right">{employeeSummary.hours}</TableCell>
                <TableCell>{employeeSummary.rawText}</TableCell>
              </TableRow>
            ) : null}

            {!querying &&
            ((formValues.mode === 'all' && allSummaries.length === 0) ||
              (formValues.mode === 'employee' && !employeeSummary)) ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No work hour summary loaded.
                </TableCell>
              </TableRow>
            ) : null}

            {querying ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Loading work hour summary...
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
