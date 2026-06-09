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
import { useState } from 'react';
import { staffingCheckService } from '../services/staffingCheckService';
import type { StaffingCheckResult } from '../types/staffingCheck';

type CheckMode = 'date' | 'week';

type UnderstaffingFormValues = {
  mode: CheckMode;
  date: string;
  startDate: string;
  endDate: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function UnderstaffingCheckPage() {
  const today = getToday();
  const [results, setResults] = useState<StaffingCheckResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [formValues, setFormValues] = useState<UnderstaffingFormValues>({
    mode: 'date',
    date: today,
    startDate: today,
    endDate: today,
  });

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
      setError('Date is required.');
      return;
    }

    if (formValues.mode === 'week') {
      if (!formValues.startDate || !formValues.endDate) {
        setError('Start date and end date are required.');
        return;
      }

      if (formValues.startDate > formValues.endDate) {
        setError('Start date cannot be after end date.');
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
          Understaffing Check
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Display backend understaffing validation results and missing periods.
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
              <InputLabel id="understaffing-mode-label">Scope</InputLabel>
              <Select
                labelId="understaffing-mode-label"
                label="Scope"
                value={formValues.mode}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    mode: event.target.value as CheckMode,
                  }))
                }
              >
                <MenuItem value="date">Single Date</MenuItem>
                <MenuItem value="week">Date Range</MenuItem>
              </Select>
            </FormControl>

            {formValues.mode === 'date' ? (
              <TextField
                label="Date"
                type="date"
                value={formValues.date}
                onChange={handleDateChange('date')}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
            ) : (
              <>
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
              </>
            )}

            <Button
              type="submit"
              variant="contained"
              startIcon={<SearchIcon />}
              disabled={checking}
              sx={{ minWidth: 140 }}
            >
              {checking ? 'Checking...' : 'Check'}
            </Button>
          </Stack>
        </Box>
      </Paper>

      {hasChecked && results.length === 0 ? (
        <Alert severity="success">No understaffing results found.</Alert>
      ) : null}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Affected Position</TableCell>
              <TableCell>Missing Period</TableCell>
              <TableCell>Backend Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.id} hover>
                <TableCell>{result.date || formValues.date || '-'}</TableCell>
                <TableCell>
                  <Chip label={result.position} color="warning" variant="outlined" size="small" />
                </TableCell>
                <TableCell>{result.period}</TableCell>
                <TableCell>{result.rawText}</TableCell>
              </TableRow>
            ))}

            {!checking && results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No understaffing check loaded.
                </TableCell>
              </TableRow>
            ) : null}

            {checking ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Loading understaffing results...
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
