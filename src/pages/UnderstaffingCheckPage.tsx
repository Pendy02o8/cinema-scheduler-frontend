import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { staffingCheckService } from '../services/staffingCheckService';
import { weeklyScheduleService } from '../services/weeklyScheduleService';
import type { StaffingCheckResult } from '../types/staffingCheck';
import type { WeeklySchedule } from '../types/weeklySchedule';

type CheckMode = 'date' | 'week';

type UnderstaffingFormValues = {
  mode: CheckMode;
  date: string;
  weeklyScheduleId: string;
  startDate: string;
  endDate: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return '發生未預期的錯誤。';
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateWithWeekday(date?: string) {
  if (!date) {
    return '-';
  }

  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const parsedDate = new Date(`${date}T00:00:00`);
  return `${date}（${weekdayLabels[parsedDate.getDay()]}）`;
}

export default function UnderstaffingCheckPage() {
  const today = getToday();
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [results, setResults] = useState<StaffingCheckResult[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [formValues, setFormValues] = useState<UnderstaffingFormValues>({
    mode: 'week',
    date: today,
    weeklyScheduleId: '',
    startDate: today,
    endDate: today,
  });

  const loadWeeklySchedules = useCallback(async () => {
    setLoadingSchedules(true);
    setError(null);

    try {
      const data = await weeklyScheduleService.getWeeklySchedules();
      setWeeklySchedules(data);
      setFormValues((current) => {
        if (current.weeklyScheduleId || !data[0]) {
          return current;
        }

        return {
          ...current,
          weeklyScheduleId: String(data[0].id),
          startDate: data[0].weekStartDate,
          endDate: data[0].weekEndDate,
        };
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWeeklySchedules();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadWeeklySchedules]);

  const handleDateChange =
    (field: keyof Pick<UnderstaffingFormValues, 'date' | 'startDate' | 'endDate'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formValues.mode === 'date' && !formValues.date) {
      setError('日期為必填。');
      return;
    }

    if (formValues.mode === 'week') {
      if (!formValues.weeklyScheduleId) {
        setError('週排班為必填。');
        return;
      }

      if (formValues.startDate > formValues.endDate) {
        setError('開始日期不能晚於結束日期。');
        return;
      }
    }

    setChecking(true);
    setError(null);

    try {
      const data =
        formValues.mode === 'date'
          ? await staffingCheckService.getUnderstaffingByDate(formValues.date)
          : await staffingCheckService.getUnderstaffingByWeek({
              startDate: formValues.startDate,
              endDate: formValues.endDate,
            });
      setResults(data);
      setHasChecked(true);
    } catch (checkError) {
      setError(getErrorMessage(checkError));
    } finally {
      setChecking(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h2">
          缺人檢查
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          查看排班中人力不足的時段與受影響崗位。
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
          >
            <FormControl sx={{ minWidth: { xs: '100%', md: 160 } }}>
              <InputLabel id="understaffing-mode-label">檢查範圍</InputLabel>
              <Select
                labelId="understaffing-mode-label"
                label="檢查範圍"
                value={formValues.mode}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    mode: event.target.value as CheckMode,
                  }))
                }
              >
                <MenuItem value="date">單日</MenuItem>
                <MenuItem value="week">週排班</MenuItem>
              </Select>
            </FormControl>

            {formValues.mode === 'date' ? (
              <TextField
                label="日期"
                type="date"
                value={formValues.date}
                onChange={handleDateChange('date')}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
            ) : (
              <>
                <FormControl sx={{ minWidth: { xs: '100%', md: 280 } }} required>
                  <InputLabel id="understaffing-week-label">週排班</InputLabel>
                  <Select
                    labelId="understaffing-week-label"
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
                    {weeklySchedules.map((schedule) => (
                      <MenuItem key={schedule.id} value={String(schedule.id)}>
                        {schedule.weekStartDate} 至 {schedule.weekEndDate}
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
                  disabled
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="結束日期"
                  type="date"
                  value={formValues.endDate}
                  onChange={handleDateChange('endDate')}
                  required
                  disabled
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </>
            )}

            <Button
              type="submit"
              variant="contained"
              startIcon={<SearchIcon />}
              disabled={checking || loadingSchedules}
              sx={{ minWidth: 140 }}
            >
              {checking ? '檢查中...' : '檢查'}
            </Button>
          </Stack>
        </Box>
      </Paper>

      {hasChecked && results.length === 0 ? (
        <Alert severity="success">沒有少編結果。</Alert>
      ) : null}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>日期</TableCell>
              <TableCell>受影響崗位</TableCell>
              <TableCell>缺少時段</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.id} hover>
                <TableCell>{formatDateWithWeekday(result.date || formValues.date)}</TableCell>
                <TableCell>
                  <Chip label={result.position} color="warning" variant="outlined" size="small" />
                </TableCell>
                <TableCell>{result.period}</TableCell>
              </TableRow>
            ))}

            {!checking && results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  尚未載入少編檢查。
                </TableCell>
              </TableRow>
            ) : null}

            {checking ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  載入少編結果中...
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
