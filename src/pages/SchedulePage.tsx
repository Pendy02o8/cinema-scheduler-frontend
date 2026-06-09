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
import { employeeService } from '../services/employeeService';
import { positionService } from '../services/positionService';
import { scheduleAssignmentService } from '../services/scheduleAssignmentService';
import { weeklyScheduleService } from '../services/weeklyScheduleService';
import type { Employee } from '../types/employee';
import type { Position } from '../types/position';
import type {
  ScheduleAssignment,
  ScheduleAssignmentPayload,
} from '../types/scheduleAssignment';
import type {
  WeeklySchedule,
  WeeklySchedulePayload,
  WeeklyScheduleStatus,
} from '../types/weeklySchedule';

type WeeklyScheduleFormValues = {
  weekStartDate: string;
  weekEndDate: string;
  status: WeeklyScheduleStatus;
};

type AssignmentFormValues = {
  weeklyScheduleId: string;
  employeeId: string;
  positionId: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
};

const emptyScheduleFormValues: WeeklyScheduleFormValues = {
  weekStartDate: '',
  weekEndDate: '',
  status: 'DRAFT',
};

const emptyAssignmentFormValues: AssignmentFormValues = {
  weeklyScheduleId: '',
  employeeId: '',
  positionId: '',
  date: '',
  startTime: '',
  endTime: '',
  note: '',
};

const scheduleStatuses: WeeklyScheduleStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

function getStatusColor(status: string) {
  if (status === 'DRAFT') {
    return 'warning';
  }

  if (status === 'PUBLISHED') {
    return 'success';
  }

  return 'default';
}

function formatTime(time?: string | null) {
  if (!time) {
    return '-';
  }

  return time.slice(0, 5);
}

function formatDateLabel(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function formatWeekday(date: string) {
  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const parsedDate = new Date(`${date}T00:00:00`);
  return weekdayLabels[parsedDate.getDay()];
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDatesBetween(startDate: string, endDate: string) {
  const dates: string[] = [];
  const currentDate = new Date(`${startDate}T00:00:00`);
  const finalDate = new Date(`${endDate}T00:00:00`);

  while (currentDate <= finalDate) {
    dates.push(formatDateValue(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (dates.length <= 7) {
    return dates.sort((firstDate, secondDate) => {
      const firstWeekday = new Date(`${firstDate}T00:00:00`).getDay();
      const secondWeekday = new Date(`${secondDate}T00:00:00`).getDay();
      const firstMondayIndex = (firstWeekday + 6) % 7;
      const secondMondayIndex = (secondWeekday + 6) % 7;
      return firstMondayIndex - secondMondayIndex;
    });
  }

  return dates;
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function hasAssignmentConflict(
  assignments: ScheduleAssignment[],
  editingAssignmentId: number | null,
  employeeId: number,
  date: string,
  startTime: string,
  endTime: string,
) {
  const newStart = toMinutes(startTime);
  const newEnd = toMinutes(endTime);

  return assignments.some((assignment) => {
    if (assignment.id === editingAssignmentId) {
      return false;
    }

    if (assignment.employee.id !== employeeId || assignment.date !== date) {
      return false;
    }

    const existingStart = toMinutes(formatTime(assignment.startTime));
    const existingEnd = toMinutes(formatTime(assignment.endTime));

    return newStart < existingEnd && newEnd > existingStart;
  });
}

export default function SchedulePage() {
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WeeklySchedule | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<ScheduleAssignment | null>(null);
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<WeeklySchedule | null>(null);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] =
    useState<ScheduleAssignment | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [scheduleFormValues, setScheduleFormValues] = useState<WeeklyScheduleFormValues>(
    emptyScheduleFormValues,
  );
  const [assignmentFormValues, setAssignmentFormValues] = useState<AssignmentFormValues>(
    emptyAssignmentFormValues,
  );

  const employeeNameById = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee.name]));
  }, [employees]);

  const positionNameById = useMemo(() => {
    return new Map(positions.map((position) => [position.id, position.name]));
  }, [positions]);

  const selectedSchedule = useMemo(() => {
    return weeklySchedules.find((schedule) => String(schedule.id) === selectedScheduleId) ?? null;
  }, [selectedScheduleId, weeklySchedules]);

  const scheduleDates = useMemo(() => {
    if (!selectedSchedule) {
      return [];
    }

    return getDatesBetween(selectedSchedule.weekStartDate, selectedSchedule.weekEndDate);
  }, [selectedSchedule]);

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((firstEmployee, secondEmployee) => {
      const titleCompare = firstEmployee.jobTitle.localeCompare(secondEmployee.jobTitle);

      if (titleCompare !== 0) {
        return titleCompare;
      }

      return firstEmployee.name.localeCompare(secondEmployee.name);
    });
  }, [employees]);

  const visibleAssignments = useMemo(() => {
    if (!selectedSchedule) {
      return assignments;
    }

    return assignments.filter((assignment) => {
      if (assignment.weeklySchedule?.id === selectedSchedule.id) {
        return true;
      }

      return (
        assignment.date >= selectedSchedule.weekStartDate &&
        assignment.date <= selectedSchedule.weekEndDate
      );
    });
  }, [assignments, selectedSchedule]);

  const assignmentGrid = useMemo(() => {
    const grid = new Map<string, ScheduleAssignment[]>();

    visibleAssignments.forEach((assignment) => {
      const key = `${assignment.employee.id}-${assignment.date}`;
      const currentAssignments = grid.get(key) ?? [];
      currentAssignments.push(assignment);
      grid.set(key, currentAssignments);
    });

    grid.forEach((items) => {
      items.sort((firstAssignment, secondAssignment) =>
        formatTime(firstAssignment.startTime).localeCompare(formatTime(secondAssignment.startTime)),
      );
    });

    return grid;
  }, [visibleAssignments]);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [scheduleData, assignmentData, employeeData, positionData] = await Promise.all([
        weeklyScheduleService.getWeeklySchedules(),
        scheduleAssignmentService.getScheduleAssignments(),
        employeeService.getEmployees(),
        positionService.getPositions(),
      ]);
      setWeeklySchedules(scheduleData);
      setAssignments(assignmentData);
      setEmployees(employeeData);
      setPositions(positionData);
      setSelectedScheduleId((currentScheduleId) => {
        const currentScheduleExists = scheduleData.some(
          (schedule) => String(schedule.id) === currentScheduleId,
        );

        if (currentScheduleExists) {
          return currentScheduleId;
        }

        return scheduleData[0] ? String(scheduleData[0].id) : '';
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadPageData]);

  const handleOpenCreateSchedule = () => {
    setEditingSchedule(null);
    setScheduleFormValues(emptyScheduleFormValues);
    setScheduleFormOpen(true);
  };

  const handleOpenEditSchedule = (schedule: WeeklySchedule) => {
    setEditingSchedule(schedule);
    setScheduleFormValues({
      weekStartDate: schedule.weekStartDate,
      weekEndDate: schedule.weekEndDate,
      status: schedule.status as WeeklyScheduleStatus,
    });
    setScheduleFormOpen(true);
  };

  const handleOpenCreateAssignment = () => {
    setEditingAssignment(null);
    setAssignmentFormValues({
      ...emptyAssignmentFormValues,
      weeklyScheduleId: selectedScheduleId,
      date: selectedSchedule?.weekStartDate ?? '',
    });
    setAssignmentFormOpen(true);
  };

  const handleOpenCreateAssignmentForCell = (employee: Employee, date: string) => {
    setEditingAssignment(null);
    setAssignmentFormValues({
      ...emptyAssignmentFormValues,
      weeklyScheduleId: selectedScheduleId,
      employeeId: String(employee.id),
      date,
    });
    setAssignmentFormOpen(true);
  };

  const handleOpenEditAssignment = (assignment: ScheduleAssignment) => {
    setEditingAssignment(assignment);
    setAssignmentFormValues({
      weeklyScheduleId: assignment.weeklySchedule ? String(assignment.weeklySchedule.id) : '',
      employeeId: String(assignment.employee.id),
      positionId: String(assignment.position.id),
      date: assignment.date,
      startTime: formatTime(assignment.startTime),
      endTime: formatTime(assignment.endTime),
      note: assignment.note ?? '',
    });
    setAssignmentFormOpen(true);
  };

  const handleCloseScheduleForm = () => {
    if (!saving) {
      setScheduleFormOpen(false);
    }
  };

  const handleCloseAssignmentForm = () => {
    if (!saving) {
      setAssignmentFormOpen(false);
    }
  };

  const handleScheduleDateChange =
    (field: keyof Pick<WeeklyScheduleFormValues, 'weekStartDate' | 'weekEndDate'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setScheduleFormValues((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleAssignmentChange =
    (field: keyof Pick<AssignmentFormValues, 'date' | 'startTime' | 'endTime' | 'note'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setAssignmentFormValues((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmitSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: WeeklySchedulePayload = {
      weekStartDate: scheduleFormValues.weekStartDate,
      weekEndDate: scheduleFormValues.weekEndDate,
      status: scheduleFormValues.status,
    };

    if (!payload.weekStartDate || !payload.weekEndDate) {
      setError('Start date and end date are required.');
      return;
    }

    if (payload.weekStartDate > payload.weekEndDate) {
      setError('Start date cannot be after end date.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingSchedule) {
        await weeklyScheduleService.updateWeeklySchedule(editingSchedule.id, payload);
      } else {
        await weeklyScheduleService.createWeeklySchedule(payload);
      }

      setScheduleFormOpen(false);
      await loadPageData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const employeeId = Number(assignmentFormValues.employeeId);
    const positionId = Number(assignmentFormValues.positionId);
    const weeklyScheduleId = Number(assignmentFormValues.weeklyScheduleId);

    if (
      !employeeId ||
      !positionId ||
      !assignmentFormValues.date ||
      !assignmentFormValues.startTime ||
      !assignmentFormValues.endTime
    ) {
      setError('Employee, position, date, start time, and end time are required.');
      return;
    }

    if (assignmentFormValues.startTime >= assignmentFormValues.endTime) {
      setError('Start time must be before end time.');
      return;
    }

    if (
      hasAssignmentConflict(
        assignments,
        editingAssignment?.id ?? null,
        employeeId,
        assignmentFormValues.date,
        assignmentFormValues.startTime,
        assignmentFormValues.endTime,
      )
    ) {
      setError('Scheduling conflict: this employee already has an overlapping shift.');
      return;
    }

    const payload: ScheduleAssignmentPayload = {
      weeklySchedule: weeklyScheduleId ? { id: weeklyScheduleId } : undefined,
      employee: { id: employeeId },
      position: { id: positionId },
      date: assignmentFormValues.date,
      startTime: assignmentFormValues.startTime,
      endTime: assignmentFormValues.endTime,
      note: assignmentFormValues.note.trim(),
    };

    setSaving(true);
    setError(null);

    try {
      if (editingAssignment) {
        await scheduleAssignmentService.updateScheduleAssignment(editingAssignment.id, payload);
      } else {
        await scheduleAssignmentService.createScheduleAssignment(payload);
      }

      setAssignmentFormOpen(false);
      await loadPageData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteSchedule = async () => {
    if (!deleteScheduleTarget) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await weeklyScheduleService.deleteWeeklySchedule(deleteScheduleTarget.id);
      setDeleteScheduleTarget(null);
      await loadPageData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteAssignment = async () => {
    if (!deleteAssignmentTarget) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await scheduleAssignmentService.deleteScheduleAssignment(deleteAssignmentTarget.id);
      setDeleteAssignmentTarget(null);
      await loadPageData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={4}>
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
            Weekly Schedule Management
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage schedule weeks and assign employees to cinema positions.
          </Typography>
        </Box>

        <Tooltip title="Refresh schedules">
          <span>
            <IconButton onClick={loadPageData} disabled={loading || saving}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="h5" component="h3">
              Schedule Board
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              View assignments by employee and date.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FormControl sx={{ minWidth: { xs: '100%', sm: 280 } }}>
              <InputLabel id="schedule-board-week-label">Week</InputLabel>
              <Select
                labelId="schedule-board-week-label"
                label="Week"
                value={selectedScheduleId}
                onChange={(event) => setSelectedScheduleId(event.target.value)}
              >
                {weeklySchedules.map((schedule) => (
                  <MenuItem key={schedule.id} value={String(schedule.id)}>
                    {schedule.weekStartDate} to {schedule.weekEndDate}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateAssignment}>
              Assign Employee
            </Button>
          </Stack>
        </Stack>

        <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: '100%' }}>
          <Table
            size="small"
            sx={{
              minWidth: 980,
              borderCollapse: 'collapse',
              '& th, & td': {
                borderRight: 1,
                borderBottom: 1,
                borderColor: 'divider',
              },
              '& th:last-of-type, & td:last-of-type': {
                borderRight: 0,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell
                  rowSpan={2}
                  sx={{
                    width: 120,
                    bgcolor: 'grey.100',
                    fontWeight: 700,
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                  }}
                >
                  Job Title
                </TableCell>
                <TableCell
                  rowSpan={2}
                  sx={{
                    width: 120,
                    bgcolor: 'grey.100',
                    fontWeight: 700,
                    position: 'sticky',
                    left: 120,
                    zIndex: 3,
                  }}
                >
                  Name
                </TableCell>
                {scheduleDates.map((date) => (
                  <TableCell
                    key={date}
                    align="center"
                    sx={{ bgcolor: 'grey.100', fontWeight: 700, minWidth: 150 }}
                  >
                    {formatDateLabel(date)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                {scheduleDates.map((date) => (
                  <TableCell
                    key={date}
                    align="center"
                    sx={{
                      bgcolor: 'grey.100',
                      color: formatWeekday(date) === '六' || formatWeekday(date) === '日'
                        ? 'error.main'
                        : 'text.secondary',
                      fontWeight: 700,
                    }}
                  >
                    {formatWeekday(date)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedSchedule && sortedEmployees.map((employee) => (
                <TableRow key={employee.id} hover>
                  <TableCell
                    sx={{
                      bgcolor: 'background.paper',
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {employee.jobTitle}
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: 'background.paper',
                      position: 'sticky',
                      left: 120,
                      zIndex: 2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {employee.name}
                  </TableCell>
                  {scheduleDates.map((date) => {
                    const cellAssignments = assignmentGrid.get(`${employee.id}-${date}`) ?? [];

                    return (
                      <TableCell
                        key={date}
                        align="center"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleOpenCreateAssignmentForCell(employee, date)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleOpenCreateAssignmentForCell(employee, date);
                          }
                        }}
                        sx={{
                          height: 64,
                          minWidth: 150,
                          bgcolor: cellAssignments.length > 0 ? 'background.paper' : 'grey.50',
                          cursor: 'pointer',
                          transition: 'background-color 120ms ease',
                          p: 1,
                          '&:hover': {
                            bgcolor: cellAssignments.length > 0 ? 'grey.50' : 'grey.100',
                          },
                          '&:focus-visible': {
                            outline: 2,
                            outlineColor: 'primary.main',
                            outlineOffset: -2,
                          },
                        }}
                      >
                        {cellAssignments.length > 0 ? (
                          <Stack spacing={0.5}>
                            {cellAssignments.map((assignment) => (
                              <Box key={assignment.id}>
                                <Typography variant="body2" sx={{ lineHeight: 1.35 }}>
                                  {formatTime(assignment.startTime)}-{formatTime(assignment.endTime)}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ lineHeight: 1.35, fontWeight: 700 }}
                                >
                                  {positionNameById.get(assignment.position.id) ??
                                    assignment.position.name}
                                </Typography>
                                {assignment.note ? (
                                  <Typography
                                    variant="caption"
                                    color="error.main"
                                    sx={{ display: 'block', lineHeight: 1.25 }}
                                  >
                                    {assignment.note}
                                  </Typography>
                                ) : null}
                              </Box>
                            ))}
                          </Stack>
                        ) : (
                          <Typography color="text.disabled">-</Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}

              {!loading && selectedSchedule && sortedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2 + scheduleDates.length}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : null}

              {!loading && !selectedSchedule ? (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Select or create a weekly schedule to view the board.
                  </TableCell>
                </TableRow>
              ) : null}

              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={Math.max(2 + scheduleDates.length, 2)}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    Loading schedule board...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h5" component="h3">
            Weekly Schedules
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateSchedule}>
            Add Week
          </Button>
        </Stack>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {weeklySchedules.map((schedule) => (
                <TableRow key={schedule.id} hover>
                  <TableCell>{schedule.id}</TableCell>
                  <TableCell>{schedule.weekStartDate}</TableCell>
                  <TableCell>{schedule.weekEndDate}</TableCell>
                  <TableCell>
                    <Chip
                      label={schedule.status}
                      color={getStatusColor(schedule.status)}
                      size="small"
                      variant={schedule.status === 'DRAFT' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit weekly schedule">
                      <IconButton
                        aria-label="edit weekly schedule"
                        onClick={() => handleOpenEditSchedule(schedule)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete weekly schedule">
                      <IconButton
                        aria-label="delete weekly schedule"
                        color="error"
                        onClick={() => setDeleteScheduleTarget(schedule)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && weeklySchedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No weekly schedules found.
                  </TableCell>
                </TableRow>
              ) : null}

              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Loading weekly schedules...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h5" component="h3">
            Schedule Assignments
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateAssignment}>
            Assign Employee
          </Button>
        </Stack>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Start</TableCell>
                <TableCell>End</TableCell>
                <TableCell>Note</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id} hover>
                  <TableCell>{assignment.id}</TableCell>
                  <TableCell>{assignment.date}</TableCell>
                  <TableCell>
                    {employeeNameById.get(assignment.employee.id) ?? assignment.employee.name}
                  </TableCell>
                  <TableCell>
                    {positionNameById.get(assignment.position.id) ?? assignment.position.name}
                  </TableCell>
                  <TableCell>{formatTime(assignment.startTime)}</TableCell>
                  <TableCell>{formatTime(assignment.endTime)}</TableCell>
                  <TableCell>{assignment.note || '-'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit assignment">
                      <IconButton
                        aria-label="edit assignment"
                        onClick={() => handleOpenEditAssignment(assignment)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete assignment">
                      <IconButton
                        aria-label="delete assignment"
                        color="error"
                        onClick={() => setDeleteAssignmentTarget(assignment)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No schedule assignments found.
                  </TableCell>
                </TableRow>
              ) : null}

              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Loading schedule assignments...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Dialog open={scheduleFormOpen} onClose={handleCloseScheduleForm} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmitSchedule}>
          <DialogTitle>{editingSchedule ? 'Edit Week' : 'Add Week'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Start Date"
                type="date"
                value={scheduleFormValues.weekStartDate}
                onChange={handleScheduleDateChange('weekStartDate')}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="End Date"
                type="date"
                value={scheduleFormValues.weekEndDate}
                onChange={handleScheduleDateChange('weekEndDate')}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControl fullWidth required>
                <InputLabel id="weekly-schedule-status-label">Status</InputLabel>
                <Select
                  labelId="weekly-schedule-status-label"
                  label="Status"
                  value={scheduleFormValues.status}
                  onChange={(event) =>
                    setScheduleFormValues((current) => ({
                      ...current,
                      status: event.target.value as WeeklyScheduleStatus,
                    }))
                  }
                >
                  {scheduleStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseScheduleForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={assignmentFormOpen} onClose={handleCloseAssignmentForm} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmitAssignment}>
          <DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Assign Employee'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControl fullWidth>
                <InputLabel id="assignment-week-label">Weekly Schedule</InputLabel>
                <Select
                  labelId="assignment-week-label"
                  label="Weekly Schedule"
                  value={assignmentFormValues.weeklyScheduleId}
                  onChange={(event) =>
                    setAssignmentFormValues((current) => ({
                      ...current,
                      weeklyScheduleId: event.target.value,
                    }))
                  }
                >
                  <MenuItem value="">No Week Selected</MenuItem>
                  {weeklySchedules.map((schedule) => (
                    <MenuItem key={schedule.id} value={String(schedule.id)}>
                      {schedule.id} - {schedule.weekStartDate} to {schedule.weekEndDate}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel id="assignment-employee-label">Employee</InputLabel>
                <Select
                  labelId="assignment-employee-label"
                  label="Employee"
                  value={assignmentFormValues.employeeId}
                  onChange={(event) =>
                    setAssignmentFormValues((current) => ({
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

              <FormControl fullWidth required>
                <InputLabel id="assignment-position-label">Position</InputLabel>
                <Select
                  labelId="assignment-position-label"
                  label="Position"
                  value={assignmentFormValues.positionId}
                  onChange={(event) =>
                    setAssignmentFormValues((current) => ({
                      ...current,
                      positionId: event.target.value,
                    }))
                  }
                >
                  {positions.map((position) => (
                    <MenuItem key={position.id} value={String(position.id)}>
                      {position.id} - {position.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Date"
                type="date"
                value={assignmentFormValues.date}
                onChange={handleAssignmentChange('date')}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Start Time"
                type="time"
                value={assignmentFormValues.startTime}
                onChange={handleAssignmentChange('startTime')}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="End Time"
                type="time"
                value={assignmentFormValues.endTime}
                onChange={handleAssignmentChange('endTime')}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Note"
                value={assignmentFormValues.note}
                onChange={handleAssignmentChange('note')}
                fullWidth
                multiline
                minRows={3}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAssignmentForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={Boolean(deleteScheduleTarget)}
        onClose={() => setDeleteScheduleTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Week</DialogTitle>
        <DialogContent>
          <Typography>
            Delete week {deleteScheduleTarget?.weekStartDate} to {deleteScheduleTarget?.weekEndDate}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteScheduleTarget(null)} disabled={saving}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDeleteSchedule}
            disabled={saving}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteAssignmentTarget)}
        onClose={() => setDeleteAssignmentTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Assignment</DialogTitle>
        <DialogContent>
          <Typography>
            Delete {deleteAssignmentTarget?.employee.name}'s assignment on {deleteAssignmentTarget?.date}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAssignmentTarget(null)} disabled={saving}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDeleteAssignment}
            disabled={saving}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
