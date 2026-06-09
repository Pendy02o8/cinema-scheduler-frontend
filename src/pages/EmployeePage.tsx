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
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
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
import { useCallback, useEffect, useState } from 'react';
import { employeeService } from '../services/employeeService';
import type { Employee, EmployeePayload } from '../types/employee';

type EmployeeFormValues = {
  name: string;
  jobTitle: string;
  isActive: boolean;
  note: string;
};

const emptyFormValues: EmployeeFormValues = {
  name: '',
  jobTitle: '',
  isActive: true,
  note: '',
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

export default function EmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [formValues, setFormValues] = useState<EmployeeFormValues>(emptyFormValues);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await employeeService.getEmployees();
      setEmployees(data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEmployees();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadEmployees]);

  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setFormValues(emptyFormValues);
    setFormOpen(true);
  };

  const handleOpenEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormValues({
      name: employee.name,
      jobTitle: employee.jobTitle,
      isActive: employee.isActive,
      note: employee.note ?? '',
    });
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    if (!saving) {
      setFormOpen(false);
    }
  };

  const handleTextChange =
    (field: keyof Pick<EmployeeFormValues, 'name' | 'jobTitle' | 'note'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleActiveChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormValues((current) => ({
      ...current,
      isActive: event.target.checked,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: EmployeePayload = {
      name: formValues.name.trim(),
      jobTitle: formValues.jobTitle.trim(),
      isActive: formValues.isActive,
      note: formValues.note.trim(),
    };

    if (!payload.name || !payload.jobTitle) {
      setError('Name and job title are required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee.id, payload);
      } else {
        await employeeService.createEmployee(payload);
      }

      setFormOpen(false);
      await loadEmployees();
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
      await employeeService.deleteEmployee(deleteTarget.id);
      setDeleteTarget(null);
      await loadEmployees();
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
            Employee Management
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage cinema employees and active employment status.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh employees">
            <span>
              <IconButton onClick={loadEmployees} disabled={loading || saving}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Add Employee
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Job Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Note</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id} hover>
                <TableCell>{employee.id}</TableCell>
                <TableCell>{employee.name}</TableCell>
                <TableCell>{employee.jobTitle}</TableCell>
                <TableCell>
                  <Chip
                    label={employee.isActive ? 'Active' : 'Inactive'}
                    color={employee.isActive ? 'success' : 'default'}
                    size="small"
                    variant={employee.isActive ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>{employee.note || '-'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit employee">
                    <IconButton aria-label="edit employee" onClick={() => handleOpenEdit(employee)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete employee">
                    <IconButton
                      aria-label="delete employee"
                      color="error"
                      onClick={() => setDeleteTarget(employee)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {!loading && employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No employees found.
                </TableCell>
              </TableRow>
            ) : null}

            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Loading employees...
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={formOpen} onClose={handleCloseForm} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Name"
                value={formValues.name}
                onChange={handleTextChange('name')}
                required
                fullWidth
              />
              <TextField
                label="Job Title"
                value={formValues.jobTitle}
                onChange={handleTextChange('jobTitle')}
                required
                fullWidth
              />
              <TextField
                label="Note"
                value={formValues.note}
                onChange={handleTextChange('note')}
                fullWidth
                multiline
                minRows={3}
              />
              <FormControlLabel
                control={<Switch checked={formValues.isActive} onChange={handleActiveChange} />}
                label="Active"
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
        <DialogTitle>Delete Employee</DialogTitle>
        <DialogContent>
          <Typography>
            Delete {deleteTarget?.name}? This action cannot be undone.
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
