import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
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
import html2canvas from 'html2canvas';
import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { employeeService } from '../services/employeeService';
import { availabilityService } from '../services/availabilityService';
import { monthlyLeaveService } from '../services/monthlyLeaveService';
import { positionService } from '../services/positionService';
import { scheduleAssignmentService } from '../services/scheduleAssignmentService';
import { staffingCheckService } from '../services/staffingCheckService';
import { weeklyScheduleService } from '../services/weeklyScheduleService';
import type { Availability } from '../types/availability';
import type { Employee } from '../types/employee';
import type { Position } from '../types/position';
import type { MonthlyLeave } from '../types/monthlyLeave';
import type {
  ScheduleAssignment,
  ScheduleAssignmentPayload,
} from '../types/scheduleAssignment';
import type { StaffingCheckResult } from '../types/staffingCheck';
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

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

type CellActionTarget = {
  employee: Employee;
  date: string;
  assignments: ScheduleAssignment[];
};

type OverstaffingRange = {
  date: string;
  position: string;
  startTime: string;
  endTime: string;
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
const movieNotesStorageKey = 'cinema-scheduler-movie-notes';
const scheduleStartMinuteOptions = ['20', '50'];
const scheduleEndMinuteOptions = ['00', '30'];
const scheduleHourOptions = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, '0'),
);
const shortageHeaderColor = '#ffd6e0';
const overstaffingAssignmentColor = '#fff3cd';
const restCellColor = '#ffd966';
const restTextColor = '#d32f2f';
const scheduleStickyColumnWidth = 96;
const scheduleDateColumnMinWidth = 104;
const jobTitleOrder: Record<string, number> = {
  副理: 1,
  會計: 2,
  主任: 3,
  早班正職: 4,
  早班正職人員: 4,
  組長: 5,
  總務: 6,
  放映師: 7,
  晚班正職: 8,
  晚班正職人員: 8,
  正職清潔: 9,
  晚班清潔: 10,
  早班工讀生: 11,
  晚班工讀生: 12,
};
const noPositionRequiredJobTitles = ['會計', '早班清潔', '晚班清潔'];

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

function getSuccessMessage(response: unknown, fallbackMessage: string) {
  return typeof response === 'string' && response.trim() ? response : fallbackMessage;
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

function formatCompactTime(time?: string | null) {
  return formatTime(time).replace(':', '');
}

function formatAvailabilityPreview(availability: Availability) {
  const boundaryTime = formatCompactTime(availability.boundaryTime);
  const availabilityType = availability.availabilityType.toUpperCase();

  if (availabilityType === 'ALL_DAY') {
    return '整天可';
  }

  if (availabilityType === 'UNAVAILABLE' || availabilityType === 'OFF') {
    return '休';
  }

  if (availabilityType === 'BEFORE' && boundaryTime !== '-') {
    return `${boundaryTime}前`;
  }

  if (availabilityType === 'AFTER' && boundaryTime !== '-') {
    return `${boundaryTime}後`;
  }

  return availability.note || availability.availabilityType;
}

function isRestAvailability(availability: Availability) {
  const availabilityType = availability.availabilityType.toUpperCase();

  return availabilityType === 'UNAVAILABLE' || availabilityType === 'OFF';
}

function isNoPositionRequiredJobTitle(jobTitle?: string | null) {
  return Boolean(jobTitle && noPositionRequiredJobTitles.includes(jobTitle));
}

function getAssignmentPositionName(assignment: ScheduleAssignment) {
  return assignment.position?.name ?? '';
}

function getTimeHour(time: string) {
  return time.split(':')[0] ?? '';
}

function getTimeMinute(time: string, minuteOptions: string[]) {
  const minute = time.split(':')[1] ?? '';
  return minuteOptions.includes(minute) ? minute : '';
}

function buildScheduleTime(
  currentTime: string,
  changedPart: 'hour' | 'minute',
  changedValue: string,
  minuteOptions: string[],
  defaultMinute: string,
) {
  const currentHour = getTimeHour(currentTime);
  const currentMinute = getTimeMinute(currentTime, minuteOptions);
  const nextHour = changedPart === 'hour' ? changedValue : currentHour || '00';
  const nextMinute = changedPart === 'minute' ? changedValue : currentMinute || defaultMinute;

  return `${nextHour}:${nextMinute}`;
}

function normalizeStaffingText(value: string) {
  return value.trim().replace(/\s+/g, '');
}

function parseStaffingPeriod(period: string) {
  const match = period.match(/(\d{2}:\d{2})\s*[~-]\s*(\d{2}:\d{2})/);

  if (!match) {
    return null;
  }

  return {
    startTime: match[1],
    endTime: match[2],
  };
}

function isActualUnderstaffingResult(result: { period: string }) {
  return Boolean(parseStaffingPeriod(result.period));
}

function hasTimeOverlap(
  firstStartTime: string,
  firstEndTime: string,
  secondStartTime: string,
  secondEndTime: string,
) {
  const firstRange = getShiftRange(firstStartTime, firstEndTime);
  const secondRange = getShiftRange(secondStartTime, secondEndTime);

  return firstRange.startMinutes < secondRange.endMinutes
    && firstRange.endMinutes > secondRange.startMinutes;
}

function isAssignmentOverstaffed(
  assignment: ScheduleAssignment,
  overstaffingRanges: OverstaffingRange[],
) {
  const positionName = getAssignmentPositionName(assignment);

  if (!positionName) {
    return false;
  }

  const assignmentStartTime = formatTime(assignment.startTime);
  const assignmentEndTime = formatTime(assignment.endTime);
  const assignmentPosition = normalizeStaffingText(positionName);

  return overstaffingRanges.some((range) => {
    return (
      range.date === assignment.date
      && normalizeStaffingText(range.position) === assignmentPosition
      && hasTimeOverlap(
        assignmentStartTime,
        assignmentEndTime,
        range.startTime,
        range.endTime,
      )
    );
  });
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

function formatDateStamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getDefaultScheduleMonth(schedule: WeeklySchedule | null) {
  const titleDate = schedule ? new Date(`${schedule.weekStartDate}T00:00:00`) : new Date();
  return String(titleDate.getMonth() + 1);
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

function getShiftRange(startTime: string, endTime: string) {
  const startMinutes = toMinutes(startTime);
  let endMinutes = toMinutes(endTime);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return {
    startMinutes,
    endMinutes,
  };
}

function hasAssignmentConflict(
  assignments: ScheduleAssignment[],
  editingAssignmentId: number | null,
  employeeId: number,
  date: string,
  startTime: string,
  endTime: string,
) {
  const newRange = getShiftRange(startTime, endTime);

  return assignments.some((assignment) => {
    if (assignment.id === editingAssignmentId) {
      return false;
    }

    if (assignment.employee.id !== employeeId || assignment.date !== date) {
      return false;
    }

    const existingRange = getShiftRange(
      formatTime(assignment.startTime),
      formatTime(assignment.endTime),
    );

    return newRange.startMinutes < existingRange.endMinutes
      && newRange.endMinutes > existingRange.startMinutes;
  });
}

function getStoredMovieNotes() {
  if (typeof window === 'undefined') {
    return {};
  }

  const storedValue = window.localStorage.getItem(movieNotesStorageKey);

  if (!storedValue) {
    return {};
  }

  try {
    return JSON.parse(storedValue) as Record<string, string>;
  } catch {
    return {};
  }
}

export default function SchedulePage() {
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [monthlyLeaves, setMonthlyLeaves] = useState<MonthlyLeave[]>([]);
  const [availabilityPreview, setAvailabilityPreview] = useState<Availability[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const [importingAvailability, setImportingAvailability] = useState(false);
  const [generatingFixedAssignments, setGeneratingFixedAssignments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffingCheckError, setStaffingCheckError] = useState<string | null>(null);
  const [shortageDateSet, setShortageDateSet] = useState<Set<string>>(() => new Set());
  const [understaffingResults, setUnderstaffingResults] = useState<StaffingCheckResult[]>([]);
  const [overstaffingRanges, setOverstaffingRanges] = useState<OverstaffingRange[]>([]);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
  const [assignmentWarnings, setAssignmentWarnings] = useState<string[]>([]);
  const [pendingAssignmentPayload, setPendingAssignmentPayload] =
    useState<ScheduleAssignmentPayload | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<WeeklySchedule | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<ScheduleAssignment | null>(null);
  const [cellActionTarget, setCellActionTarget] = useState<CellActionTarget | null>(null);
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<WeeklySchedule | null>(null);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] =
    useState<ScheduleAssignment | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [scheduleMonthOverrides, setScheduleMonthOverrides] = useState<Record<string, string>>({});
  const [movieNotes, setMovieNotes] = useState<Record<string, string>>(getStoredMovieNotes);
  const [movieNoteDate, setMovieNoteDate] = useState<string | null>(null);
  const [movieNoteValue, setMovieNoteValue] = useState('');
  const [availabilityImportFile, setAvailabilityImportFile] = useState<File | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [scheduleFormValues, setScheduleFormValues] = useState<WeeklyScheduleFormValues>(
    emptyScheduleFormValues,
  );
  const [assignmentFormValues, setAssignmentFormValues] = useState<AssignmentFormValues>(
    emptyAssignmentFormValues,
  );

  const positionNameById = useMemo(() => {
    return new Map(positions.map((position) => [position.id, position.name]));
  }, [positions]);

  const getAssignmentDisplayPositionName = useCallback(
    (assignment: ScheduleAssignment) => {
      if (!assignment.position) {
        return '';
      }

      return positionNameById.get(assignment.position.id) ?? assignment.position.name;
    },
    [positionNameById],
  );

  const selectedSchedule = useMemo(() => {
    return weeklySchedules.find((schedule) => String(schedule.id) === selectedScheduleId) ?? null;
  }, [selectedScheduleId, weeklySchedules]);

  const scheduleMonthKey = selectedScheduleId || 'default';
  const scheduleMonth =
    scheduleMonthOverrides[scheduleMonthKey] ?? getDefaultScheduleMonth(selectedSchedule);
  const scheduleTitle = `環球中華影城${scheduleMonth}月班表`;

  const selectedAssignmentEmployee = useMemo(() => {
    return employees.find((employee) => String(employee.id) === assignmentFormValues.employeeId)
      ?? null;
  }, [assignmentFormValues.employeeId, employees]);

  const assignmentPositionRequired = !isNoPositionRequiredJobTitle(
    selectedAssignmentEmployee?.jobTitle,
  );

  const scheduleDates = useMemo(() => {
    if (!selectedSchedule) {
      return [];
    }

    return getDatesBetween(selectedSchedule.weekStartDate, selectedSchedule.weekEndDate);
  }, [selectedSchedule]);

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((firstEmployee, secondEmployee) => {
      const firstOrder = jobTitleOrder[firstEmployee.jobTitle] ?? 999;
      const secondOrder = jobTitleOrder[secondEmployee.jobTitle] ?? 999;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return firstEmployee.id - secondEmployee.id;
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

  const monthlyLeaveGrid = useMemo(() => {
    const grid = new Map<string, MonthlyLeave>();

    monthlyLeaves.forEach((monthlyLeave) => {
      grid.set(`${monthlyLeave.employee.id}-${monthlyLeave.leaveDate}`, monthlyLeave);
    });

    return grid;
  }, [monthlyLeaves]);

  const availabilityPreviewGrid = useMemo(() => {
    const grid = new Map<string, Availability[]>();

    availabilityPreview.forEach((availability) => {
      const key = `${availability.employee.id}-${availability.date}`;
      const currentAvailability = grid.get(key) ?? [];
      currentAvailability.push(availability);
      grid.set(key, currentAvailability);
    });

    return grid;
  }, [availabilityPreview]);

  const understaffingByDate = useMemo(() => {
    const grid = new Map<string, StaffingCheckResult[]>();

    understaffingResults.forEach((result) => {
      if (!result.date) {
        return;
      }

      const currentResults = grid.get(result.date) ?? [];
      currentResults.push(result);
      grid.set(result.date, currentResults);
    });

    return grid;
  }, [understaffingResults]);

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

  const loadMonthlyLeavesForSchedule = useCallback(async (schedule: WeeklySchedule | null) => {
    if (!schedule) {
      setMonthlyLeaves([]);
      return;
    }

    try {
      const data = await monthlyLeaveService.getMonthlyLeavesByRange(
        schedule.weekStartDate,
        schedule.weekEndDate,
      );
      setMonthlyLeaves(data);
    } catch (loadError) {
      setMonthlyLeaves([]);
      setStaffingCheckError(getErrorMessage(loadError));
    }
  }, []);

  const loadAvailabilityPreviewForSchedule = useCallback(async (schedule: WeeklySchedule | null) => {
    if (!schedule) {
      setAvailabilityPreview([]);
      return;
    }

    try {
      const availabilityData = await availabilityService.getAvailability();
      setAvailabilityPreview(
        availabilityData.filter((availability) => {
          if (availability.weeklySchedule?.id === schedule.id) {
            return true;
          }

          return availability.date >= schedule.weekStartDate && availability.date <= schedule.weekEndDate;
        }),
      );
    } catch (loadError) {
      setAvailabilityPreview([]);
      setStaffingCheckError(getErrorMessage(loadError));
    }
  }, []);

  const fetchStaffingCheckResults = useCallback(async (schedule: WeeklySchedule | null) => {
    if (!schedule) {
      setShortageDateSet(new Set());
      setUnderstaffingResults([]);
      setOverstaffingRanges([]);
      setStaffingCheckError(null);
      return;
    }

    try {
      const query = {
        startDate: schedule.weekStartDate,
        endDate: schedule.weekEndDate,
      };
      const scheduleDatesForCheck = getDatesBetween(schedule.weekStartDate, schedule.weekEndDate);
      const [dailyUnderstaffingResults, overstaffingResults] = await Promise.all([
        Promise.all(
          scheduleDatesForCheck.map((date) => staffingCheckService.getUnderstaffingByDate(date)),
        ),
        staffingCheckService.getOverstaffingByWeek(query),
      ]);
      const understaffingResults = dailyUnderstaffingResults.flat();
      const actualUnderstaffingResults = understaffingResults.filter(isActualUnderstaffingResult);

      setShortageDateSet(
        new Set(
          actualUnderstaffingResults
            .map((result) => result.date)
            .filter((date): date is string => Boolean(date)),
        ),
      );
      setUnderstaffingResults(actualUnderstaffingResults);
      setOverstaffingRanges(
        overstaffingResults.flatMap((result) => {
          const period = parseStaffingPeriod(result.period);

          if (!result.date || !period) {
            return [];
          }

          return [
            {
              date: result.date,
              position: result.position,
              startTime: period.startTime,
              endTime: period.endTime,
            },
          ];
        }),
      );
      setStaffingCheckError(null);
    } catch (checkError) {
      setShortageDateSet(new Set());
      setUnderstaffingResults([]);
      setOverstaffingRanges([]);
      setStaffingCheckError(getErrorMessage(checkError));
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchStaffingCheckResults(selectedSchedule);
      void loadMonthlyLeavesForSchedule(selectedSchedule);
      void loadAvailabilityPreviewForSchedule(selectedSchedule);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    assignments,
    fetchStaffingCheckResults,
    loadAvailabilityPreviewForSchedule,
    loadMonthlyLeavesForSchedule,
    selectedSchedule,
  ]);

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
    setAssignmentWarnings([]);
    setPendingAssignmentPayload(null);
    setAssignmentFormValues({
      ...emptyAssignmentFormValues,
      weeklyScheduleId: selectedScheduleId,
      date: selectedSchedule?.weekStartDate ?? '',
    });
    setAssignmentFormOpen(true);
  };

  const handleOpenCreateAssignmentForCell = (employee: Employee, date: string) => {
    setEditingAssignment(null);
    setAssignmentWarnings([]);
    setPendingAssignmentPayload(null);
    setAssignmentFormValues({
      ...emptyAssignmentFormValues,
      weeklyScheduleId: selectedScheduleId,
      employeeId: String(employee.id),
      date,
    });
    setAssignmentFormOpen(true);
  };

  const handleOpenCellActions = (
    employee: Employee,
    date: string,
    cellAssignments: ScheduleAssignment[],
  ) => {
    if (cellAssignments.length === 0) {
      handleOpenCreateAssignmentForCell(employee, date);
      return;
    }

    setCellActionTarget({
      employee,
      date,
      assignments: cellAssignments,
    });
  };

  const handleOpenCreateAssignmentFromCellActions = () => {
    if (!cellActionTarget) {
      return;
    }

    handleOpenCreateAssignmentForCell(cellActionTarget.employee, cellActionTarget.date);
    setCellActionTarget(null);
  };

  const handleOpenEditAssignment = (assignment: ScheduleAssignment) => {
    setEditingAssignment(assignment);
    setAssignmentWarnings([]);
    setPendingAssignmentPayload(null);
    setAssignmentFormValues({
      weeklyScheduleId: assignment.weeklySchedule ? String(assignment.weeklySchedule.id) : '',
      employeeId: String(assignment.employee.id),
      positionId: assignment.position ? String(assignment.position.id) : '',
      date: assignment.date,
      startTime: formatTime(assignment.startTime),
      endTime: formatTime(assignment.endTime),
      note: assignment.note ?? '',
    });
    setAssignmentFormOpen(true);
  };

  const handleOpenMovieNote = (date: string) => {
    const key = `${selectedScheduleId}-${date}`;
    setMovieNoteDate(date);
    setMovieNoteValue(movieNotes[key] ?? '');
  };

  const handleCloseScheduleForm = () => {
    if (!saving) {
      setScheduleFormOpen(false);
    }
  };

  const handleCloseAssignmentForm = () => {
    if (!saving) {
      setAssignmentFormOpen(false);
      setAssignmentWarnings([]);
      setPendingAssignmentPayload(null);
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

  const createAssignment = async (payload: ScheduleAssignmentPayload) => {
    await scheduleAssignmentService.createScheduleAssignment(payload);
    setAssignmentFormOpen(false);
    setAssignmentWarnings([]);
    setPendingAssignmentPayload(null);
    await loadPageData();
  };

  const handleSubmitAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const employeeId = Number(assignmentFormValues.employeeId);
    const positionId = Number(assignmentFormValues.positionId);
    const weeklyScheduleId = Number(assignmentFormValues.weeklyScheduleId);

    if (
      !employeeId ||
      (assignmentPositionRequired && !positionId) ||
      !assignmentFormValues.date ||
      !assignmentFormValues.startTime ||
      !assignmentFormValues.endTime
    ) {
      setError('Employee, position, date, start time, and end time are required.');
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
      position: assignmentPositionRequired ? { id: positionId } : undefined,
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
        setAssignmentFormOpen(false);
        await loadPageData();
      } else {
        const validationResult = await scheduleAssignmentService.validateScheduleAssignment(payload);

        if (validationResult.warnings.length > 0) {
          setAssignmentWarnings(validationResult.warnings);
          setPendingAssignmentPayload(payload);
          return;
        }

        await createAssignment(payload);
      }
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAssignmentWarning = () => {
    if (!saving) {
      setAssignmentWarnings([]);
      setPendingAssignmentPayload(null);
    }
  };

  const handleConfirmAssignmentWarning = async () => {
    if (!pendingAssignmentPayload) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createAssignment(pendingAssignmentPayload);
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

  const handleSaveMovieNote = () => {
    if (!movieNoteDate || !selectedScheduleId) {
      return;
    }

    const key = `${selectedScheduleId}-${movieNoteDate}`;
    const nextMovieNotes = {
      ...movieNotes,
      [key]: movieNoteValue.trim(),
    };

    if (!nextMovieNotes[key]) {
      delete nextMovieNotes[key];
    }

    setMovieNotes(nextMovieNotes);
    window.localStorage.setItem(movieNotesStorageKey, JSON.stringify(nextMovieNotes));
    setMovieNoteDate(null);
    setMovieNoteValue('');
  };

  const handleAvailabilityImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;

    if (selectedFile && !selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      setAvailabilityImportFile(null);
      setSnackbar({
        open: true,
        message: 'Please select an .xlsx file.',
        severity: 'error',
      });
      event.target.value = '';
      return;
    }

    setAvailabilityImportFile(selectedFile);
  };

  const handleImportAvailabilityExcel = async () => {
    const weeklyScheduleId = Number(selectedScheduleId);

    if (!weeklyScheduleId) {
      setSnackbar({
        open: true,
        message: 'Please select a weekly schedule.',
        severity: 'error',
      });
      return;
    }

    if (!availabilityImportFile) {
      setSnackbar({
        open: true,
        message: 'Please select an Excel file.',
        severity: 'error',
      });
      return;
    }

    setImportingAvailability(true);

    try {
      const message = await availabilityService.importAvailabilityExcel(
        availabilityImportFile,
        weeklyScheduleId,
      );
      setSnackbar({
        open: true,
        message,
        severity: 'success',
      });
      setAvailabilityImportFile(null);
      await loadPageData();
    } catch (importError) {
      setSnackbar({
        open: true,
        message: getErrorMessage(importError),
        severity: 'error',
      });
    } finally {
      setImportingAvailability(false);
    }
  };

  const handleGenerateFixedAssignments = async () => {
    if (!selectedSchedule) {
      setSnackbar({
        open: true,
        message: 'Please select a weekly schedule.',
        severity: 'error',
      });
      return;
    }

    setGeneratingFixedAssignments(true);

    try {
      const message = await scheduleAssignmentService.generateFixedAssignments(
        selectedSchedule.id,
        selectedSchedule.weekStartDate,
        selectedSchedule.weekEndDate,
      );
      setSnackbar({
        open: true,
        message: getSuccessMessage(message, 'Fixed assignments generated.'),
        severity: 'success',
      });
      await loadPageData();
      await loadMonthlyLeavesForSchedule(selectedSchedule);
      await loadAvailabilityPreviewForSchedule(selectedSchedule);
      await fetchStaffingCheckResults(selectedSchedule);
    } catch (generateError) {
      setSnackbar({
        open: true,
        message: getErrorMessage(generateError),
        severity: 'error',
      });
    } finally {
      setGeneratingFixedAssignments(false);
    }
  };

  const exportScheduleImage = async () => {
    const sourceExportArea = document.getElementById('schedule-export-content');

    if (!sourceExportArea) {
      setError('Schedule export area was not found.');
      return;
    }

    const sourceTitle = sourceExportArea.querySelector<HTMLElement>('[data-schedule-export-title]');
    const sourceTable = sourceExportArea.querySelector<HTMLTableElement>('[data-schedule-export-table]');

    if (!sourceTitle || !sourceTable) {
      setError('Schedule export content was not found.');
      return;
    }

    setExportingImage(true);
    setError(null);

    const exportClone = document.createElement('div');

    try {
      exportClone.id = 'schedule-export-content-clone';
      exportClone.style.position = 'fixed';
      exportClone.style.left = '-100000px';
      exportClone.style.top = '0';
      exportClone.style.width = 'fit-content';
      exportClone.style.maxWidth = 'none';
      exportClone.style.display = 'inline-block';
      exportClone.style.overflow = 'visible';
      exportClone.style.backgroundColor = '#ffffff';

      const titleClone = sourceTitle.cloneNode(true) as HTMLElement;
      const tableClone = sourceTable.cloneNode(true) as HTMLTableElement;
      tableClone.querySelectorAll('[data-html2canvas-ignore]').forEach((element) => {
        element.remove();
      });

      const exportStyle = document.createElement('style');
      exportStyle.textContent = `
        #schedule-export-content-clone {
          display: inline-block !important;
          width: fit-content !important;
          max-width: none !important;
        }
        #schedule-export-content-clone .MuiTableCell-root {
          position: static !important;
          left: auto !important;
          right: auto !important;
          z-index: auto !important;
        }
        #schedule-export-content-clone [data-schedule-export-table] {
          border-collapse: collapse !important;
        }
        #schedule-export-content-clone [data-staffing-highlight="shortage"] {
          background-color: #f5f5f5 !important;
        }
        #schedule-export-content-clone [data-staffing-highlight="overstaffing"] {
          background-color: transparent !important;
        }
      `;
      exportClone.appendChild(exportStyle);
      exportClone.appendChild(titleClone);
      exportClone.appendChild(tableClone);

      document.body.appendChild(exportClone);
      await document.fonts.ready;
      await new Promise((resolve) => {
        window.requestAnimationFrame(resolve);
      });
      await new Promise((resolve) => {
        window.requestAnimationFrame(resolve);
      });

      const exportWidth = Math.ceil(tableClone.getBoundingClientRect().width);
      const exportHeight = Math.ceil(exportClone.getBoundingClientRect().height);

      exportClone.style.width = `${exportWidth}px`;
      titleClone.style.width = `${exportWidth}px`;
      tableClone.style.width = `${exportWidth}px`;

      const canvas = await html2canvas(exportClone, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: exportWidth,
        height: exportHeight,
        windowWidth: exportWidth,
        windowHeight: exportHeight,
        scrollX: 0,
        scrollY: 0,
      });
      const imageUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = imageUrl;
      downloadLink.download = `schedule_${formatDateStamp(new Date())}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (exportError) {
      setError(getErrorMessage(exportError));
    } finally {
      if (exportClone.parentElement) {
        exportClone.parentElement.removeChild(exportClone);
      }

      setExportingImage(false);
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
      {staffingCheckError ? (
        <Alert severity="warning">
          Staffing check results could not be loaded: {staffingCheckError}
        </Alert>
      ) : null}

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
            <TextField
              label="班表月份"
              size="small"
              type="number"
              value={scheduleMonth}
              onChange={(event) =>
                setScheduleMonthOverrides((current) => ({
                  ...current,
                  [scheduleMonthKey]: event.target.value,
                }))
              }
              slotProps={{
                htmlInput: {
                  min: 1,
                  max: 12,
                  inputMode: 'numeric',
                },
              }}
              sx={{ width: { xs: '100%', sm: 120 } }}
            />
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={importingAvailability}
            >
              選擇 Excel 檔案
              <input
                type="file"
                accept=".xlsx"
                hidden
                onChange={handleAvailabilityImportFileChange}
              />
            </Button>
            <Typography color="text.secondary" sx={{ alignSelf: 'center', minWidth: 140 }}>
              {availabilityImportFile ? availabilityImportFile.name : 'No file selected'}
            </Typography>
            <Button
              variant="contained"
              onClick={() => void handleImportAvailabilityExcel()}
              disabled={importingAvailability || !selectedScheduleId || !availabilityImportFile}
            >
              {importingAvailability ? '匯入中...' : '匯入假表'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => void handleGenerateFixedAssignments()}
              disabled={generatingFixedAssignments || !selectedSchedule}
            >
              {generatingFixedAssignments ? '產生中...' : '產生固定班'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => void exportScheduleImage()}
              disabled={loading || exportingImage}
            >
              {exportingImage ? '匯出中...' : '匯出圖片'}
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateAssignment}>
              Assign Employee
            </Button>
          </Stack>
        </Stack>

        <Box
          id="schedule-export-area"
          sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto', bgcolor: '#ffffff' }}
        >
          <Box id="schedule-export-content" sx={{ width: '100%', bgcolor: '#ffffff' }}>
            <Typography
              component="div"
              data-schedule-export-title
              sx={{
                py: 1,
                textAlign: 'center',
                fontSize: 20,
                fontWeight: 700,
                lineHeight: 1.5,
                color: 'text.primary',
              }}
            >
              {scheduleTitle}
            </Typography>
            <TableContainer
              component={Paper}
              variant="outlined"
              data-schedule-export-table-container
              sx={{ width: '100%', overflowX: 'auto', bgcolor: '#ffffff' }}
            >
              <Table
            data-schedule-export-table
            size="small"
            sx={{
              width: '100%',
              minWidth: `calc(${scheduleStickyColumnWidth * 2}px + ${
                scheduleDates.length || 1
              } * ${scheduleDateColumnMinWidth}px)`,
              borderCollapse: 'collapse',
              '& th, & td': {
                borderRight: 1,
                borderBottom: 1,
                borderColor: 'divider',
                px: 1,
                py: 0.5,
              },
              '& th:last-of-type, & td:last-of-type': {
                borderRight: 0,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell
                  align="center"
                  rowSpan={2}
                  sx={{
                    width: scheduleStickyColumnWidth,
                    minWidth: scheduleStickyColumnWidth,
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
                  align="center"
                  rowSpan={2}
                  sx={{
                    width: scheduleStickyColumnWidth,
                    minWidth: scheduleStickyColumnWidth,
                    bgcolor: 'grey.100',
                    fontWeight: 700,
                    position: 'sticky',
                    left: scheduleStickyColumnWidth,
                    zIndex: 3,
                  }}
                >
                  Name
                </TableCell>
                {scheduleDates.map((date) => (
                  <TableCell
                    key={date}
                    align="center"
                    data-staffing-highlight={shortageDateSet.has(date) ? 'shortage' : undefined}
                    sx={{
                      bgcolor: shortageDateSet.has(date) ? shortageHeaderColor : 'grey.100',
                      fontWeight: 700,
                      minWidth: scheduleDateColumnMinWidth,
                      whiteSpace: 'nowrap',
                    }}
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
                    data-staffing-highlight={shortageDateSet.has(date) ? 'shortage' : undefined}
                    sx={{
                      bgcolor: shortageDateSet.has(date) ? shortageHeaderColor : 'grey.100',
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
              {selectedSchedule ? (
                <TableRow hover>
                  <TableCell
                    align="center"
                    sx={{
                      bgcolor: 'background.paper',
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      whiteSpace: 'nowrap',
                      fontWeight: 700,
                    }}
                  >
                    Movie
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      bgcolor: 'background.paper',
                      position: 'sticky',
                      left: scheduleStickyColumnWidth,
                      zIndex: 2,
                      whiteSpace: 'nowrap',
                      fontWeight: 700,
                    }}
                  >
                    Notes
                  </TableCell>
                  {scheduleDates.map((date) => {
                    const movieNote = movieNotes[`${selectedScheduleId}-${date}`];

                    return (
                      <TableCell
                        key={date}
                        align="center"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleOpenMovieNote(date)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleOpenMovieNote(date);
                          }
                        }}
                        sx={{
                          minWidth: scheduleDateColumnMinWidth,
                          bgcolor: movieNote ? 'background.paper' : 'grey.50',
                          cursor: 'pointer',
                          color: movieNote ? 'error.main' : 'text.disabled',
                          fontWeight: movieNote ? 700 : 400,
                          px: 1,
                          py: 0.5,
                          '&:hover': {
                            bgcolor: 'grey.100',
                          },
                          '&:focus-visible': {
                            outline: 2,
                            outlineColor: 'primary.main',
                            outlineOffset: -2,
                          },
                        }}
                      >
                        {movieNote}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ) : null}

              {selectedSchedule && sortedEmployees.map((employee) => (
                <TableRow key={employee.id} hover>
                  <TableCell
                    align="center"
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
                    align="center"
                    sx={{
                      bgcolor: 'background.paper',
                      position: 'sticky',
                      left: scheduleStickyColumnWidth,
                      zIndex: 2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {employee.name}
                  </TableCell>
                  {scheduleDates.map((date) => {
                    const cellAssignments = assignmentGrid.get(`${employee.id}-${date}`) ?? [];
                    const monthlyLeave = monthlyLeaveGrid.get(`${employee.id}-${date}`);
                    const previewAvailability =
                      availabilityPreviewGrid.get(`${employee.id}-${date}`) ?? [];
                    const restAvailability = previewAvailability.find(isRestAvailability);
                    const hasRestDay = Boolean(monthlyLeave || restAvailability);

                    return (
                      <TableCell
                        key={date}
                        align="center"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleOpenCellActions(employee, date, cellAssignments)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleOpenCellActions(employee, date, cellAssignments);
                          }
                        }}
                        sx={{
                          minWidth: scheduleDateColumnMinWidth,
                          bgcolor: cellAssignments.length > 0
                            ? 'background.paper'
                            : hasRestDay
                              ? restCellColor
                              : 'grey.50',
                          cursor: 'pointer',
                          transition: 'background-color 120ms ease',
                          px: 1,
                          py: 0.5,
                          '&:hover': {
                            bgcolor: cellAssignments.length > 0
                              ? 'grey.50'
                              : hasRestDay
                                ? restCellColor
                                : 'grey.100',
                          },
                          '&:focus-visible': {
                            outline: 2,
                            outlineColor: 'primary.main',
                            outlineOffset: -2,
                          },
                        }}
                      >
                        {cellAssignments.length > 0 ? (
                          <Stack spacing={0.25}>
                            {cellAssignments.map((assignment) => {
                              const isOverstaffed = isAssignmentOverstaffed(
                                assignment,
                                overstaffingRanges,
                              );
                              const positionName = getAssignmentDisplayPositionName(assignment);

                              return (
                                <Box
                                  key={assignment.id}
                                  data-staffing-highlight={
                                    isOverstaffed ? 'overstaffing' : undefined
                                  }
                                  sx={{
                                    borderRadius: 1,
                                    bgcolor: isOverstaffed
                                      ? overstaffingAssignmentColor
                                      : 'transparent',
                                    px: 0.5,
                                    py: 0,
                                    '&:hover': {
                                      bgcolor: isOverstaffed
                                        ? overstaffingAssignmentColor
                                        : 'grey.100',
                                    },
                                  }}
                                >
                                  <Stack
                                    direction="row"
                                    spacing={0.5}
                                    sx={{ alignItems: 'flex-start', justifyContent: 'center' }}
                                  >
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography
                                        component="span"
                                        variant="body2"
                                        sx={{
                                          fontSize: 15,
                                          fontWeight: 600,
                                          lineHeight: 1.35,
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {`${formatCompactTime(assignment.startTime)}-${formatCompactTime(
                                          assignment.endTime,
                                        )}${positionName ? `  ${positionName}` : ''}`}
                                      </Typography>
                                    </Box>
                                    <Stack
                                      direction="row"
                                      spacing={0}
                                      data-html2canvas-ignore="true"
                                    >
                                      <Tooltip title="Edit assignment">
                                        <IconButton
                                          aria-label="edit assignment from board"
                                          size="small"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            handleOpenEditAssignment(assignment);
                                          }}
                                          sx={{ p: 0, ml: 0.25 }}
                                        >
                                          <EditIcon sx={{ fontSize: 13 }} />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete assignment">
                                        <IconButton
                                          aria-label="delete assignment from board"
                                          color="error"
                                          size="small"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            setDeleteAssignmentTarget(assignment);
                                          }}
                                          sx={{ p: 0, ml: 0.25 }}
                                        >
                                          <DeleteIcon sx={{ fontSize: 13 }} />
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>
                                  </Stack>
                                  {assignment.note ? (
                                    <Typography
                                      variant="caption"
                                      color="error.main"
                                      sx={{ display: 'block', lineHeight: 1.15 }}
                                    >
                                      {assignment.note}
                                    </Typography>
                                  ) : null}
                                </Box>
                              );
                            })}
                          </Stack>
                        ) : hasRestDay ? (
                          <Typography
                            style={{ color: restTextColor, fontWeight: 400 }}
                            sx={{ lineHeight: 1.35 }}
                          >
                            休
                          </Typography>
                        ) : previewAvailability.length > 0 ? (
                          <Stack spacing={0.25} data-html2canvas-ignore="true">
                            {previewAvailability.map((availability) => (
                              <Typography
                                key={availability.id}
                                variant="caption"
                                sx={{
                                  color: 'text.disabled',
                                  display: 'block',
                                  lineHeight: 1.15,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {formatAvailabilityPreview(availability)}
                              </Typography>
                            ))}
                          </Stack>
                        ) : (
                          <Typography color="text.disabled" data-html2canvas-ignore="true">
                            -
                          </Typography>
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

              {selectedSchedule ? (
                <>
                  <TableRow data-html2canvas-ignore="true">
                    <TableCell
                      align="center"
                      colSpan={2}
                      sx={{
                        bgcolor: 'grey.100',
                        fontWeight: 700,
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                      }}
                    >
                      排班狀況
                    </TableCell>
                    {scheduleDates.map((date) => (
                      <TableCell
                        key={date}
                        align="center"
                        sx={{
                          minWidth: scheduleDateColumnMinWidth,
                          bgcolor: shortageDateSet.has(date) ? shortageHeaderColor : 'grey.100',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDateLabel(date)} {formatWeekday(date)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow data-html2canvas-ignore="true">
                    <TableCell
                      align="center"
                      colSpan={2}
                      sx={{
                        bgcolor: 'background.paper',
                        color: 'text.secondary',
                        fontWeight: 700,
                        position: 'sticky',
                        left: 0,
                        whiteSpace: 'nowrap',
                        zIndex: 2,
                      }}
                    >
                      缺人檢查
                    </TableCell>
                    {scheduleDates.map((date) => {
                      const dateResults = understaffingByDate.get(date) ?? [];

                      return (
                        <TableCell
                          key={date}
                          align="center"
                          sx={{
                            minWidth: scheduleDateColumnMinWidth,
                            bgcolor: dateResults.length > 0
                              ? shortageHeaderColor
                              : 'background.paper',
                            verticalAlign: 'top',
                          }}
                        >
                          {dateResults.length > 0 ? (
                            <Stack spacing={0.5}>
                              {dateResults.map((result) => (
                                <Typography
                                  key={result.id}
                                  variant="caption"
                                  color="error.main"
                                  sx={{
                                    display: 'block',
                                    fontWeight: 700,
                                    lineHeight: 1.3,
                                    whiteSpace: 'normal',
                                    wordBreak: 'keep-all',
                                  }}
                                >
                                  {result.position} {result.period}
                                </Typography>
                              ))}
                            </Stack>
                          ) : (
                            <Typography
                              variant="caption"
                              color="success.main"
                              sx={{ fontWeight: 700 }}
                            >
                              已補足
                            </Typography>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </>
              ) : null}
            </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
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
                      positionId: isNoPositionRequiredJobTitle(
                        employees.find((employee) => String(employee.id) === event.target.value)
                          ?.jobTitle,
                      )
                        ? ''
                        : current.positionId,
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

              <FormControl fullWidth required={assignmentPositionRequired}>
                <InputLabel id="assignment-position-label">Position</InputLabel>
                <Select
                  labelId="assignment-position-label"
                  label="Position"
                  value={assignmentFormValues.positionId}
                  disabled={!assignmentPositionRequired}
                  onChange={(event) =>
                    setAssignmentFormValues((current) => ({
                      ...current,
                      positionId: event.target.value,
                    }))
                  }
                >
                  {!assignmentPositionRequired ? (
                    <MenuItem value="">No position required</MenuItem>
                  ) : null}
                  {positions.map((position) => (
                    <MenuItem key={position.id} value={String(position.id)}>
                      {position.name}
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <FormControl fullWidth required>
                  <InputLabel id="assignment-start-hour-label">Start Hour</InputLabel>
                  <Select
                    labelId="assignment-start-hour-label"
                    label="Start Hour"
                    value={getTimeHour(assignmentFormValues.startTime)}
                    onChange={(event) =>
                      setAssignmentFormValues((current) => ({
                        ...current,
                        startTime: buildScheduleTime(
                          current.startTime,
                          'hour',
                          event.target.value,
                          scheduleStartMinuteOptions,
                          scheduleStartMinuteOptions[0],
                        ),
                      }))
                    }
                  >
                    <MenuItem value="" disabled>
                      Hour
                    </MenuItem>
                    {scheduleHourOptions.map((hour) => (
                      <MenuItem key={hour} value={hour}>
                        {hour}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth required>
                  <InputLabel id="assignment-start-minute-label">Start Minute</InputLabel>
                  <Select
                    labelId="assignment-start-minute-label"
                    label="Start Minute"
                    value={getTimeMinute(
                      assignmentFormValues.startTime,
                      scheduleStartMinuteOptions,
                    )}
                    onChange={(event) =>
                      setAssignmentFormValues((current) => ({
                        ...current,
                        startTime: buildScheduleTime(
                          current.startTime,
                          'minute',
                          event.target.value,
                          scheduleStartMinuteOptions,
                          scheduleStartMinuteOptions[0],
                        ),
                      }))
                    }
                  >
                    <MenuItem value="" disabled>
                      Minute
                    </MenuItem>
                    {scheduleStartMinuteOptions.map((minute) => (
                      <MenuItem key={minute} value={minute}>
                        {minute}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <FormControl fullWidth required>
                  <InputLabel id="assignment-end-hour-label">End Hour</InputLabel>
                  <Select
                    labelId="assignment-end-hour-label"
                    label="End Hour"
                    value={getTimeHour(assignmentFormValues.endTime)}
                    onChange={(event) =>
                      setAssignmentFormValues((current) => ({
                        ...current,
                        endTime: buildScheduleTime(
                          current.endTime,
                          'hour',
                          event.target.value,
                          scheduleEndMinuteOptions,
                          scheduleEndMinuteOptions[0],
                        ),
                      }))
                    }
                  >
                    <MenuItem value="" disabled>
                      Hour
                    </MenuItem>
                    {scheduleHourOptions.map((hour) => (
                      <MenuItem key={hour} value={hour}>
                        {hour}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth required>
                  <InputLabel id="assignment-end-minute-label">End Minute</InputLabel>
                  <Select
                    labelId="assignment-end-minute-label"
                    label="End Minute"
                    value={getTimeMinute(assignmentFormValues.endTime, scheduleEndMinuteOptions)}
                    onChange={(event) =>
                      setAssignmentFormValues((current) => ({
                        ...current,
                        endTime: buildScheduleTime(
                          current.endTime,
                          'minute',
                          event.target.value,
                          scheduleEndMinuteOptions,
                          scheduleEndMinuteOptions[0],
                        ),
                      }))
                    }
                  >
                    <MenuItem value="" disabled>
                      Minute
                    </MenuItem>
                    {scheduleEndMinuteOptions.map((minute) => (
                      <MenuItem key={minute} value={minute}>
                        {minute}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
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
        open={Boolean(pendingAssignmentPayload && assignmentWarnings.length > 0)}
        onClose={handleCancelAssignmentWarning}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>排班警告</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ pt: 1 }}>
            {assignmentWarnings.map((warning) => (
              <Alert key={warning} severity="warning">
                {warning}
              </Alert>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelAssignmentWarning} disabled={saving}>
            取消
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => void handleConfirmAssignmentWarning()}
            disabled={saving}
          >
            {saving ? '儲存中...' : '仍然排班'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(cellActionTarget)}
        onClose={() => setCellActionTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {cellActionTarget
            ? `${cellActionTarget.employee.name} - ${cellActionTarget.date}`
            : 'Assignments'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {cellActionTarget?.assignments.map((assignment) => (
              <Paper key={assignment.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{
                    alignItems: { xs: 'stretch', sm: 'center' },
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      {formatTime(assignment.startTime)}-{formatTime(assignment.endTime)}{' '}
                      {getAssignmentDisplayPositionName(assignment)}
                    </Typography>
                    {assignment.note ? (
                      <Typography color="text.secondary" variant="body2">
                        {assignment.note}
                      </Typography>
                    ) : null}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => {
                        handleOpenEditAssignment(assignment);
                        setCellActionTarget(null);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => {
                        setDeleteAssignmentTarget(assignment);
                        setCellActionTarget(null);
                      }}
                    >
                      Delete
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCellActionTarget(null)}>Close</Button>
          {cellActionTarget && cellActionTarget.assignments.length === 0 ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateAssignmentFromCellActions}
            >
              Add Assignment
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(movieNoteDate)} onClose={() => setMovieNoteDate(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          Movie Notes {movieNoteDate ? `- ${formatDateLabel(movieNoteDate)} ${formatWeekday(movieNoteDate)}` : ''}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Movie notes"
            value={movieNoteValue}
            onChange={(event) => setMovieNoteValue(event.target.value)}
            fullWidth
            multiline
            minRows={3}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setMovieNoteDate(null);
              setMovieNoteValue('');
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveMovieNote}>
            Save
          </Button>
        </DialogActions>
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
