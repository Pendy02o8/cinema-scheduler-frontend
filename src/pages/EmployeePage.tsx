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
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { employeeService } from '../services/employeeService';
import type { Employee, EmployeePayload } from '../types/employee';
import { getEmployeeTypeLabel, getFixedShiftLabel } from '../utils/employeeLabels';

type EmployeeFormValues = {
  name: string;
  jobTitle: string;
  isActive: boolean;
  requiresPositionAssignment: boolean;
  requiresMonthlyLeave: boolean;
  note: string;
  employeeType: '' | 'PART_TIME' | 'FULL_TIME' | 'CLEANER';
  fixedShiftType: '' | 'MORNING' | 'EVENING' | 'NONE';
};

type EmployeeStatusFilter = 'active' | 'all' | 'inactive';

const emptyFormValues: EmployeeFormValues = {
  name: '',
  jobTitle: '',
  isActive: true,
  requiresPositionAssignment: true,
  requiresMonthlyLeave: false,
  note: '',
  employeeType: '',
  fixedShiftType: '',
};

const deleteEmployeeFallbackMessage = '此員工已有歷史資料，無法刪除，請改用停用功能。';

function filterEmployeesByStatus(employees: Employee[], statusFilter: EmployeeStatusFilter) {
  if (statusFilter === 'active') {
    return employees.filter((employee) => employee.isActive);
  }

  if (statusFilter === 'inactive') {
    return employees.filter((employee) => !employee.isActive);
  }

  return employees;
}

function getResponseErrorMessage(error: unknown) {
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
      const message = responseData.trim();
      return message || null;
    }

    if (
      typeof responseData === 'object'
      && responseData !== null
      && 'message' in responseData
      && typeof responseData.message === 'string'
    ) {
      const message = responseData.message.trim();
      return message || null;
    }

    if (
      typeof responseData === 'object'
      && responseData !== null
      && 'detail' in responseData
      && typeof responseData.detail === 'string'
    ) {
      const message = responseData.detail.trim();
      return message || null;
    }
  }

  return null;
}

function getErrorMessage(error: unknown) {
  const responseMessage = getResponseErrorMessage(error);

  if (responseMessage) {
    return responseMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '發生未預期的錯誤。';
}

function getDeleteEmployeeErrorMessage(error: unknown) {
  return getResponseErrorMessage(error) ?? deleteEmployeeFallbackMessage;
}

export default function EmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [employeeStatusFilter, setEmployeeStatusFilter] =
    useState<EmployeeStatusFilter>('active');
  const [formValues, setFormValues] = useState<EmployeeFormValues>(emptyFormValues);
  const displayedEmployees = useMemo(
    () => filterEmployeesByStatus(employees, employeeStatusFilter),
    [employees, employeeStatusFilter],
  );

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
    setSuccess(null);
    setEditingEmployee(null);
    setFormValues(emptyFormValues);
    setFormOpen(true);
  };

  const handleOpenEdit = (employee: Employee) => {
    setSuccess(null);
    setEditingEmployee(employee);
    setFormValues({
      name: employee.name,
      jobTitle: employee.jobTitle,
      isActive: employee.isActive,
      requiresPositionAssignment: employee.requiresPositionAssignment ?? true,
      requiresMonthlyLeave: employee.requiresMonthlyLeave ?? false,
      note: employee.note ?? '',
      employeeType: employee.employeeType ?? '',
      fixedShiftType: employee.fixedShiftType ?? '',
    });
    setFormOpen(true);
  };

  const handleOpenDelete = (employee: Employee) => {
    setError(null);
    setSuccess(null);
    setDeleteErrorMessage(null);
    setDeleteTarget(employee);
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

  const handleRequiresPositionAssignmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormValues((current) => ({
      ...current,
      requiresPositionAssignment: event.target.checked,
    }));
  };

  const handleRequiresMonthlyLeaveChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormValues((current) => ({
      ...current,
      requiresMonthlyLeave: event.target.checked,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: EmployeePayload = {
      name: formValues.name.trim(),
      jobTitle: formValues.jobTitle.trim(),
      isActive: formValues.isActive,
      note: formValues.note.trim() || null,
      employeeType: formValues.employeeType || null,
      fixedShiftType: formValues.fixedShiftType || 'NONE',
      sortOrder: editingEmployee?.sortOrder ?? 9999,
      requiresPositionAssignment: formValues.requiresPositionAssignment,
      requiresMonthlyLeave: formValues.requiresMonthlyLeave,
    };

    if (!payload.name || !payload.jobTitle) {
      setError('姓名與職稱為必填。');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    setDeleteErrorMessage(null);

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
    setSuccess(null);

    try {
      await employeeService.deleteEmployee(deleteTarget.id);
      setDeleteTarget(null);
      await loadEmployees();
      setSuccess('員工已刪除。');
    } catch (deleteError) {
      setDeleteTarget(null);
      setDeleteErrorMessage(getDeleteEmployeeErrorMessage(deleteError));
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
            員工管理
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            管理影城員工資料與在職狀態。
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="employee-status-filter-label">顯示狀態</InputLabel>
            <Select
              labelId="employee-status-filter-label"
              label="顯示狀態"
              value={employeeStatusFilter}
              onChange={(event) =>
                setEmployeeStatusFilter(event.target.value as EmployeeStatusFilter)
              }
            >
              <MenuItem value="active">只顯示在職員工</MenuItem>
              <MenuItem value="all">顯示所有員工</MenuItem>
              <MenuItem value="inactive">僅顯示離職員工</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="重新整理員工">
            <span>
              <IconButton onClick={loadEmployees} disabled={loading || saving}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            新增員工
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>姓名</TableCell>
              <TableCell>職稱</TableCell>
              <TableCell>員工類型</TableCell>
              <TableCell>固定班別</TableCell>
              <TableCell>狀態</TableCell>
              <TableCell>備註</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedEmployees.map((employee) => (
              <TableRow key={employee.id} hover>
                <TableCell>{employee.name}</TableCell>
                <TableCell>{employee.jobTitle}</TableCell>
                <TableCell>{getEmployeeTypeLabel(employee.employeeType)}</TableCell>
                <TableCell>{getFixedShiftLabel(employee.fixedShiftType)}</TableCell>
                <TableCell>
                  <Chip
                    label={employee.isActive ? '在職' : '離職'}
                    color={employee.isActive ? 'success' : 'default'}
                    size="small"
                    variant={employee.isActive ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>{employee.note || '-'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="編輯員工">
                    <IconButton aria-label="編輯員工" onClick={() => handleOpenEdit(employee)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="刪除員工">
                    <IconButton
                      aria-label="刪除員工"
                      color="error"
                      onClick={() => handleOpenDelete(employee)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {!loading && displayedEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  目前沒有員工資料。
                </TableCell>
              </TableRow>
            ) : null}

            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  載入員工資料中...
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={formOpen} onClose={handleCloseForm} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editingEmployee ? '編輯員工' : '新增員工'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="姓名"
                value={formValues.name}
                onChange={handleTextChange('name')}
                required
                fullWidth
              />
              <TextField
                label="職稱"
                value={formValues.jobTitle}
                onChange={handleTextChange('jobTitle')}
                required
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="employee-type-label">員工類型</InputLabel>
                <Select
                  labelId="employee-type-label"
                  label="員工類型"
                  value={formValues.employeeType}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      employeeType: event.target.value as EmployeeFormValues['employeeType'],
                    }))
                  }
                >
                  <MenuItem value="">未設定</MenuItem>
                  <MenuItem value="PART_TIME">兼職</MenuItem>
                  <MenuItem value="FULL_TIME">正職</MenuItem>
                  <MenuItem value="CLEANER">清潔人員</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="fixed-shift-type-label">固定班別</InputLabel>
                <Select
                  labelId="fixed-shift-type-label"
                  label="固定班別"
                  value={formValues.fixedShiftType}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      fixedShiftType: event.target.value as EmployeeFormValues['fixedShiftType'],
                    }))
                  }
                >
                  <MenuItem value="">未設定</MenuItem>
                  <MenuItem value="MORNING">早班</MenuItem>
                  <MenuItem value="EVENING">晚班</MenuItem>
                  <MenuItem value="NONE">無固定班別</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="備註"
                value={formValues.note}
                onChange={handleTextChange('note')}
                fullWidth
                multiline
                minRows={3}
              />
              <FormControlLabel
                control={<Switch checked={formValues.isActive} onChange={handleActiveChange} />}
                label="在職"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formValues.requiresPositionAssignment}
                    onChange={handleRequiresPositionAssignmentChange}
                  />
                }
                label="排班時需要指定崗位"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formValues.requiresMonthlyLeave}
                    onChange={handleRequiresMonthlyLeaveChange}
                  />
                }
                label="需要月休管理"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm} disabled={saving}>
              取消
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? '儲存中...' : '儲存'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>永久刪除員工</DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: 'pre-line' }}>
            {`確定要永久刪除此員工嗎？

若員工已有班表、工讀生休假或可上班時段資料，系統將拒絕刪除。
離職員工建議使用停用功能。`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving}>
            取消
          </Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={saving}>
            刪除
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteErrorMessage)}
        onClose={() => setDeleteErrorMessage(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>無法刪除員工</DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: 'pre-line' }}>{deleteErrorMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setDeleteErrorMessage(null)}>
            知道了
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
