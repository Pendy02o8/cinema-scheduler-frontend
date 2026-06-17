import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { employeeService } from '../services/employeeService';
import type { Employee } from '../types/employee';
import { getActiveEmployees } from '../utils/employeeFilters';
import { sortEmployeesBySortOrder } from '../utils/employeeSort';

type SortableEmployeeRowProps = {
  employee: Employee;
  disabled: boolean;
};

const sortOrderStep = 10;

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

  return '發生未預期的錯誤。';
}

function SortableEmployeeRow({ employee, disabled }: SortableEmployeeRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: employee.id,
    disabled,
  });

  return (
    <TableRow
      ref={setNodeRef}
      hover
      sx={{
        opacity: isDragging ? 0.6 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <TableCell sx={{ width: 56 }}>
        <Tooltip title="拖曳排序">
          <span>
            <IconButton
              aria-label="拖曳員工排序"
              disabled={disabled}
              size="small"
              sx={{ cursor: disabled ? 'default' : 'grab' }}
              {...attributes}
              {...listeners}
            >
              <DragIndicatorIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </TableCell>
      <TableCell>{employee.name}</TableCell>
      <TableCell>{employee.jobTitle}</TableCell>
      <TableCell>
        <Chip
          label="在職"
          color="success"
          size="small"
        />
      </TableCell>
    </TableRow>
  );
}

export default function EmployeeSortPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const sortSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await employeeService.getEmployees();
      setEmployees(sortEmployeesBySortOrder(getActiveEmployees(data)));
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

  const handleSortDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setSuccess(null);
    setEmployees((currentEmployees) => {
      const oldIndex = currentEmployees.findIndex(
        (employee) => String(employee.id) === String(active.id),
      );
      const newIndex = currentEmployees.findIndex(
        (employee) => String(employee.id) === String(over.id),
      );

      if (oldIndex === -1 || newIndex === -1) {
        return currentEmployees;
      }

      return arrayMove(currentEmployees, oldIndex, newIndex);
    });
  };

  const handleSaveSortOrder = async () => {
    const payload = employees.map((employee, index) => ({
      id: employee.id,
      sortOrder: (index + 1) * sortOrderStep,
    }));

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await employeeService.updateEmployeeSortOrder(payload);
      await loadEmployees();
      setSuccess('排序已儲存。');
    } catch (sortError) {
      setError(getErrorMessage(sortError));
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
            班表排序管理
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            調整在職員工於週排班與月休等頁面的顯示順序。
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Tooltip title="重新整理排序">
            <span>
              <IconButton onClick={loadEmployees} disabled={loading || saving}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => void handleSaveSortOrder()}
            disabled={loading || saving || employees.length === 0}
          >
            {saving ? '儲存中...' : '儲存排序'}
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <DndContext
            sensors={sortSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSortDragEnd}
          >
            <SortableContext
              items={employees.map((employee) => employee.id)}
              strategy={verticalListSortingStrategy}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>員工姓名</TableCell>
                    <TableCell>職稱</TableCell>
                    <TableCell>是否在職</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((employee) => (
                    <SortableEmployeeRow
                      key={employee.id}
                      employee={employee}
                      disabled={loading || saving}
                    />
                  ))}

                  {!loading && employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        目前沒有在職員工資料。
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        載入員工排序中...
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>
        </TableContainer>
      </Paper>
    </Stack>
  );
}
