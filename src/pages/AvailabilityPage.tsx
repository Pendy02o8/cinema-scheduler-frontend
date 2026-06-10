import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material';
import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { availabilityService } from '../services/availabilityService';
import { employeeService } from '../services/employeeService';
import { weeklyScheduleService } from '../services/weeklyScheduleService';
import type {
  Availability,
  AvailabilityPayload,
  AvailabilityType,
} from '../types/availability';
import type { Employee } from '../types/employee';
import type { WeeklySchedule } from '../types/weeklySchedule';

type AvailabilityFormValues = {
  employeeId: string;
  date: string;
  availabilityType: AvailabilityType;
  boundaryTime: string;
  note: string;
};

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

const emptyFormValues: AvailabilityFormValues = {
  employeeId: '',
  date: '',
  availabilityType: 'BEFORE',
  boundaryTime: '',
  note: '',
};

const availabilityTypes: AvailabilityType[] = ['BEFORE', 'AFTER', 'UNAVAILABLE', 'ALL_DAY'];

const availabilityTypeLabels: Record<AvailabilityType, string> = {
  BEFORE: 'Before time',
  AFTER: 'After time',
  UNAVAILABLE: 'Unavailable',
  ALL_DAY: 'Available all day',
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

function formatTime(time?: string | null) {
  if (!time) {
    return '-';
  }

  return time.slice(0, 5);
}

function formatDisplayDate(date: string) {
  return date.replaceAll('-', '/');
}

function formatAvailabilityType(type: string) {
  return availabilityTypeLabels[type as AvailabilityType] ?? type;
}

function requiresBoundaryTime(type: AvailabilityType) {
  return type === 'BEFORE' || type === 'AFTER';
}

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<Availability | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Availability | null>(null);
  const [formValues, setFormValues] = useState<AvailabilityFormValues>(emptyFormValues);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [importWeeklyScheduleId, setImportWeeklyScheduleId] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const employeeNameById = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee.name]));
  }, [employees]);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [availabilityData, employeeData, weeklyScheduleData] = await Promise.all([
        selectedEmployeeId
          ? availabilityService.getAvailabilityByEmployee(Number(selectedEmployeeId))
          : availabilityService.getAvailability(),
        employeeService.getEmployees(),
        weeklyScheduleService.getWeeklySchedules(),
      ]);
      setAvailability(availabilityData);
      setEmployees(employeeData);
      setWeeklySchedules(weeklyScheduleData);
      setImportWeeklyScheduleId((currentWeeklyScheduleId) => {
        const currentScheduleExists = weeklyScheduleData.some(
          (schedule) => String(schedule.id) === currentWeeklyScheduleId,
        );

        if (currentScheduleExists) {
          return currentWeeklyScheduleId;
        }

        return weeklyScheduleData[0] ? String(weeklyScheduleData[0].id) : '';
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadPageData]);

  const handleOpenCreate = () => {
    setEditingAvailability(null);
    setFormValues({
      ...emptyFormValues,
      employeeId: selectedEmployeeId,
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (item: Availability) => {
    setEditingAvailability(item);
    setFormValues({
      employeeId: String(item.employee.id),
      date: item.date,
      availabilityType: item.availabilityType as AvailabilityType,
      boundaryTime: formatTime(item.boundaryTime),
      note: item.note ?? '',
    });
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    if (!saving) {
      setFormOpen(false);
    }
  };

  const handleTextChange =
    (field: keyof Pick<AvailabilityFormValues, 'date' | 'boundaryTime' | 'note'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const employeeId = Number(formValues.employeeId);
    const shouldIncludeBoundaryTime = requiresBoundaryTime(formValues.availabilityType);
    const boundaryTime = shouldIncludeBoundaryTime ? formValues.boundaryTime : '';

    if (!employeeId || !formValues.date) {
      setError('Employee and date are required.');
      return;
    }

    if (shouldIncludeBoundaryTime && !boundaryTime) {
      setError('Boundary time is required for BEFORE and AFTER availability.');
      return;
    }

    const payload: AvailabilityPayload = {
      employee: { id: employeeId },
      weeklySchedule: editingAvailability?.weeklySchedule
        ? { id: editingAvailability.weeklySchedule.id }
        : undefined,
      date: formValues.date,
      availabilityType: formValues.availabilityType,
      boundaryTime: boundaryTime || null,
      note: formValues.note.trim(),
    };

    setSaving(true);
    setError(null);

    try {
      if (editingAvailability) {
        await availabilityService.updateAvailability(editingAvailability.id, payload);
      } else {
        await availabilityService.createAvailability(payload);
      }

      setFormOpen(false);
      await loadPageData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await availabilityService.deleteAvailability(deleteTarget.id);
      setDeleteTarget(null);
      await loadPageData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;

    if (selectedFile && !selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      setImportFile(null);
      setSnackbar({
        open: true,
        message: 'Please select an .xlsx file.',
        severity: 'error',
      });
      event.target.value = '';
      return;
    }

    setImportFile(selectedFile);
  };

  const handleImportAvailability = async () => {
    const weeklyScheduleId = Number(importWeeklyScheduleId);

    if (!weeklyScheduleId) {
      setSnackbar({
        open: true,
        message: 'Please select a weekly schedule.',
        severity: 'error',
      });
      return;
    }

    if (!importFile) {
      setSnackbar({
        open: true,
        message: 'Please select an Excel file.',
        severity: 'error',
      });
      return;
    }

    setImporting(true);

    try {
      const message = await availabilityService.importAvailabilityExcel(importFile, weeklyScheduleId);
      setSnackbar({
        open: true,
        message,
        severity: 'success',
      });
      setImportFile(null);
      await loadPageData();
    } catch (importError) {
      setSnackbar({
        open: true,
        message: getErrorMessage(importError),
        severity: 'error',
      });
    } finally {
      setImporting(false);
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
            Availability Management
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage employee available working periods.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh availability">
            <span>
              <IconButton onClick={loadPageData} disabled={loading || saving}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Add Availability
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" component="h3">
              匯入假表
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
              Upload a Google Form Excel file for the selected weekly schedule.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
          >
            <FormControl sx={{ minWidth: { xs: '100%', md: 320 } }}>
              <InputLabel id="availability-import-week-label">Weekly Schedule</InputLabel>
              <Select
                labelId="availability-import-week-label"
                label="Weekly Schedule"
                value={importWeeklyScheduleId}
                onChange={(event) => setImportWeeklyScheduleId(event.target.value)}
              >
                <MenuItem value="" disabled>
                  No weekly schedule selected
                </MenuItem>
                {weeklySchedules.map((schedule) => (
                  <MenuItem key={schedule.id} value={String(schedule.id)}>
                    第{schedule.id}週 {formatDisplayDate(schedule.weekStartDate)} ~{' '}
                    {formatDisplayDate(schedule.weekEndDate)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={importing}
            >
              選擇 Excel 檔案
              <input
                type="file"
                accept=".xlsx"
                hidden
                onChange={handleImportFileChange}
              />
            </Button>

            <Typography color="text.secondary" sx={{ minWidth: 160 }}>
              {importFile ? importFile.name : 'No file selected'}
            </Typography>

            <Button
              variant="contained"
              onClick={() => void handleImportAvailability()}
              disabled={importing || !importWeeklyScheduleId || !importFile}
            >
              {importing ? '匯入中...' : '匯入假表'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <FormControl sx={{ minWidth: { xs: '100%', md: 320 } }}>
            <InputLabel id="employee-filter-select-label">Employee Filter</InputLabel>
            <Select
              labelId="employee-filter-select-label"
              label="Employee Filter"
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
            >
              <MenuItem value="">All Employees</MenuItem>
              {employees.map((employee) => (
                <MenuItem key={employee.id} value={String(employee.id)}>
                  {employee.id} - {employee.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography color="text.secondary">
            {selectedEmployeeId
              ? `Showing employee ID ${selectedEmployeeId}`
              : 'Showing all employees'}
          </Typography>
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Boundary Time</TableCell>
              <TableCell>Note</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availability.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.id}</TableCell>
                <TableCell>
                  {employeeNameById.get(item.employee.id) ?? item.employee.name}
                </TableCell>
                <TableCell>{item.date}</TableCell>
                <TableCell>
                  <Chip
                    label={formatAvailabilityType(item.availabilityType)}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{formatTime(item.boundaryTime)}</TableCell>
                <TableCell>{item.note || '-'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit availability">
                    <IconButton aria-label="edit availability" onClick={() => handleOpenEdit(item)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete availability">
                    <IconButton
                      aria-label="delete availability"
                      color="error"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {!loading && availability.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No availability records found.
                </TableCell>
              </TableRow>
            ) : null}

            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Loading availability...
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={formOpen} onClose={handleCloseForm} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>
            {editingAvailability ? 'Edit Availability' : 'Add Availability'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControl fullWidth required>
                <InputLabel id="employee-select-label">Employee</InputLabel>
                <Select
                  labelId="employee-select-label"
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
                label="Date"
                type="date"
                value={formValues.date}
                onChange={handleTextChange('date')}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <FormControl fullWidth required>
                <InputLabel id="availability-type-select-label">Availability Type</InputLabel>
                <Select
                  labelId="availability-type-select-label"
                  label="Availability Type"
                  value={formValues.availabilityType}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      availabilityType: event.target.value as AvailabilityType,
                    }))
                  }
                >
                  {availabilityTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {formatAvailabilityType(type)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Boundary Time"
                type="time"
                value={formValues.boundaryTime}
                onChange={handleTextChange('boundaryTime')}
                required={requiresBoundaryTime(formValues.availabilityType)}
                disabled={!requiresBoundaryTime(formValues.availabilityType)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <TextField
                label="Note"
                value={formValues.note}
                onChange={handleTextChange('note')}
                fullWidth
                multiline
                minRows={3}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete Availability</DialogTitle>
        <DialogContent>
          <Typography>
            Delete availability for {deleteTarget?.employee.name} on {deleteTarget?.date}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={saving}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
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
