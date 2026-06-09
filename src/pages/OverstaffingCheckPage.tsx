import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
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

type OverstaffingFormValues = {
  date: string;
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

export default function OverstaffingCheckPage() {
  const [results, setResults] = useState<StaffingCheckResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [formValues, setFormValues] = useState<OverstaffingFormValues>({
    date: getToday(),
  });

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormValues({
      date: event.target.value,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.date) {
      setError('Date is required.');
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const data = await staffingCheckService.getOverstaffingByDate(formValues.date);
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
          Overstaffing Check
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Display backend overstaffing validation results and excess periods.
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
            <TextField
              label="Date"
              type="date"
              value={formValues.date}
              onChange={handleDateChange}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />

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
        <Alert severity="success">No overstaffing results found.</Alert>
      ) : null}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Affected Position</TableCell>
              <TableCell>Excess Period</TableCell>
              <TableCell>Backend Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.id} hover>
                <TableCell>{result.date || formValues.date}</TableCell>
                <TableCell>
                  <Chip label={result.position} color="error" variant="outlined" size="small" />
                </TableCell>
                <TableCell>{result.period}</TableCell>
                <TableCell>{result.rawText}</TableCell>
              </TableRow>
            ))}

            {!checking && results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No overstaffing check loaded.
                </TableCell>
              </TableRow>
            ) : null}

            {checking ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Loading overstaffing results...
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
