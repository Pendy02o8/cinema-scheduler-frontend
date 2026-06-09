import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
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
import type {
  Availability,
  AvailabilityPayload,
  AvailabilityType,
} from '../types/availability';
import type { Employee } from '../types/employee';

type AvailabilityFormValues = {
  employeeId: string;
  date: string;
  availabilityType: AvailabilityType;
  boundaryTime: string;
  note: string;
};

const emptyFormValues: AvailabilityFormValues = {
  employeeId: '',
  date: '',
  availabilityType: 'BEFORE',
  boundaryTime: '',
  note: '',
};

const availabilityTypes: AvailabilityType[] = ['BEFORE', 'AFTER', 'UNAVAILABLE'];

function getErrorMessage(error: unknown) {
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

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<Availability | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Availability | null>(null);
  const [formValues, setFormValues] = useState<AvailabilityFormValues>(emptyFormValues);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  const employeeNameById = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee.name]));
  }, [employees]);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [availabilityData, employeeData] = await Promise.all([
        selectedEmployeeId
          ? availabilityService.getAvailabilityByEmployee(Number(selectedEmployeeId))
          : availabilityService.getAvailability(),
        employeeService.getEmployees(),
      ]);
      setAvailability(availabilityData);
      setEmployees(employeeData);
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
    const shouldIncludeBoundaryTime = formValues.availabilityType !== 'UNAVAILABLE';
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
                  <Chip label={item.availabilityType} size="small" variant="outlined" />
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
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Boundary Time"
                type="time"
                value={formValues.boundaryTime}
                onChange={handleTextChange('boundaryTime')}
                required={formValues.availabilityType !== 'UNAVAILABLE'}
                disabled={formValues.availabilityType === 'UNAVAILABLE'}
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
    </Stack>
  );
}
