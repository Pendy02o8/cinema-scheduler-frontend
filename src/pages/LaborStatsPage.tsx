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

  return '發生未預期的錯誤。';
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
      setError('開始日期與結束日期為必填。');
      return;
    }

    if (formValues.startDate > formValues.endDate) {
      setError('開始日期不能晚於結束日期。');
      return;
    }

    if (formValues.mode === 'employee' && !formValues.employeeId) {
      setError('查詢單一員工時必須選擇員工。');
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
            工時統計
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            依週排或日期區間查詢員工工時統計。
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => void loadReferenceData()}
          disabled={loading || querying}
        >
          重新整理
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
              <InputLabel id="work-hour-week-label">週排班</InputLabel>
              <Select
                labelId="work-hour-week-label"
                label="週排班"
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
                <MenuItem value="">自訂日期範圍</MenuItem>
                {weeklySchedules.map((schedule) => (
                  <MenuItem key={schedule.id} value={String(schedule.id)}>
                    {schedule.weekStartDate} 至 {schedule.weekEndDate}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: { xs: '100%', md: 180 } }}>
              <InputLabel id="work-hour-mode-label">查詢範圍</InputLabel>
              <Select
                labelId="work-hour-mode-label"
                label="查詢範圍"
                value={formValues.mode}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    mode: event.target.value as QueryMode,
                  }))
                }
              >
                <MenuItem value="all">全部員工</MenuItem>
                <MenuItem value="employee">單一員工</MenuItem>
              </Select>
            </FormControl>

            <FormControl
              disabled={formValues.mode === 'all'}
              required={formValues.mode === 'employee'}
              sx={{ minWidth: { xs: '100%', md: 260 } }}
            >
              <InputLabel id="work-hour-employee-label">員工</InputLabel>
              <Select
                labelId="work-hour-employee-label"
                label="員工"
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
                    {employee.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="開始日期"
              type="date"
              value={formValues.startDate}
              onChange={handleDateChange('startDate')}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="結束日期"
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
              {querying ? '查詢中...' : '查詢'}
            </Button>
          </Stack>
        </Box>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>員工</TableCell>
              <TableCell>期間</TableCell>
              <TableCell align="right">時數</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {formValues.mode === 'all'
              ? allSummaries.map((summary) => (
                  <TableRow key={summary.rawText} hover>
                    <TableCell>{summary.employeeName}</TableCell>
                    <TableCell>
                      {formValues.startDate} 至 {formValues.endDate}
                    </TableCell>
                    <TableCell align="right">{summary.hours}</TableCell>
                  </TableRow>
                ))
              : null}

            {formValues.mode === 'employee' && employeeSummary ? (
              <TableRow hover>
                <TableCell>{employeeSummary.employeeName}</TableCell>
                <TableCell>
                  {employeeSummary.startDate || formValues.startDate} 至{' '}
                  {employeeSummary.endDate || formValues.endDate}
                </TableCell>
                <TableCell align="right">{employeeSummary.hours}</TableCell>
              </TableRow>
            ) : null}

            {!querying &&
            ((formValues.mode === 'all' && allSummaries.length === 0) ||
              (formValues.mode === 'employee' && !employeeSummary)) ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  尚未載入工時統計。
                </TableCell>
              </TableRow>
            ) : null}

            {querying ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  載入工時統計中...
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
