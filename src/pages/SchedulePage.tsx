import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import PublishIcon from '@mui/icons-material/Publish';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { employeeService } from '../services/employeeService';
import { availabilityService } from '../services/availabilityService';
import { monthlyLeaveService } from '../services/monthlyLeaveService';
import { positionService } from '../services/positionService';
import { scheduleAssignmentService } from '../services/scheduleAssignmentService';
import { staffingCheckService } from '../services/staffingCheckService';
import { weeklyScheduleService } from '../services/weeklyScheduleService';
import { workHourService } from '../services/workHourService';
import type { Availability } from '../types/availability';
import type { Employee } from '../types/employee';
import type { Position } from '../types/position';
import type { MonthlyLeave } from '../types/monthlyLeave';
import type {
  ScheduleAssignment,
  ScheduleAssignmentChange,
  ScheduleAssignmentPayload,
} from '../types/scheduleAssignment';
import type { StaffingCheckResult } from '../types/staffingCheck';
import type {
  WeeklySchedule,
  WeeklySchedulePayload,
  WeeklyScheduleStatus,
} from '../types/weeklySchedule';
import { getActiveEmployees } from '../utils/employeeFilters';
import { sortEmployeesBySortOrder } from '../utils/employeeSort';
import { getLeaveTypeLabel } from '../utils/leaveType';
import { buildScheduleAssignmentRequest } from '../utils/scheduleAssignmentRequest';

type WeeklyScheduleFormValues = {
  weekStartDate: string;
  weekEndDate: string;
  status: WeeklyScheduleStatus;
};

type ScheduleListFilter = 'recent' | 'all';

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

type CopiedAssignment = {
  positionId: number | null;
  startTime: string;
  endTime: string;
  note?: string | null;
};

type PendingAssignmentAction = 'create' | 'update' | 'paste';

type OverstaffingRange = {
  date: string;
  position: string;
  startTime: string;
  endTime: string;
};

type MovieNoteDialogProps = {
  open: boolean;
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
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

const movieNotesStorageKey = 'cinema-scheduler-movie-notes';
const recentWeeklyScheduleCount = 5;
const scheduleStartMinuteOptions = ['20', '50'];
const scheduleEndMinuteOptions = ['00', '30'];
const scheduleHourOptions = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, '0'),
);
const shortageHeaderColor = '#ffd6e0';
const overstaffingAssignmentColor = '#fff3cd';
const publishedChangeCellColor = '#ffe5e5';
const publishedChangeCellHoverColor = '#ffd6d6';
const restCellColor = '#ffd966';
const restTextColor = '#d32f2f';
const restPositionName = '休';
const noPositionAssignmentPositionNames = ['不指定崗位', '無崗位', '不需崗位', '未指定崗位'];
const restAssignmentStartTime = '00:00';
const restAssignmentEndTime = '23:59';
const scheduleStickyColumnWidth = 96;
const scheduleWorkHourColumnWidth = 76;
const scheduleDateColumnMinWidth = 104;
function getStringArrayFromValue(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(getStringArrayFromValue);
  }

  return [];
}

function getErrorMessagesFromResponseData(data: unknown) {
  if (typeof data === 'string') {
    return getStringArrayFromValue(data);
  }

  if (typeof data !== 'object' || data === null) {
    return [];
  }

  const responseData = data as Record<string, unknown>;
  const messageValues = getStringArrayFromValue(responseData.message);
  const errorValues = getStringArrayFromValue(responseData.errors);

  if (messageValues.length > 0 || errorValues.length > 0) {
    return [...messageValues, ...errorValues];
  }

  return getStringArrayFromValue(responseData.detail);
}

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
    const responseErrorMessages = getErrorMessagesFromResponseData(responseData);

    if (responseErrorMessages.length > 0) {
      return responseErrorMessages.join('\n');
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

function getStringArrayProperty(data: unknown, property: string) {
  if (typeof data !== 'object' || data === null || !(property in data)) {
    return [];
  }

  return getStringArrayFromValue((data as Record<string, unknown>)[property]);
}

function getAssignmentValidationWarnings(validationResult: unknown) {
  return getStringArrayProperty(validationResult, 'warnings');
}

function getAssignmentValidationErrorMessage(validationResult: unknown) {
  const errors = getStringArrayProperty(validationResult, 'errors');

  if (errors.length > 0) {
    return errors.join('\n');
  }

  return null;
}

function getNormalizedScheduleStatus(status: string) {
  return status.trim().toUpperCase();
}

function getStatusColor(status: string) {
  const normalizedStatus = getNormalizedScheduleStatus(status);

  if (normalizedStatus === 'DRAFT') {
    return 'warning';
  }

  if (normalizedStatus === 'PUBLISHED') {
    return 'success';
  }

  return 'default';
}

function getScheduleStatusLabel(status: string) {
  const normalizedStatus = getNormalizedScheduleStatus(status);

  if (normalizedStatus === 'DRAFT') {
    return '草稿';
  }

  if (normalizedStatus === 'PUBLISHED') {
    return '已發布';
  }

  if (normalizedStatus === 'ARCHIVED') {
    return '已封存';
  }

  return status;
}

function getScheduleAssignmentChangeCellKey(employeeId: number, date: string) {
  return `${employeeId}-${date}`;
}

function getEditableScheduleStatuses(status: string) {
  const normalizedStatus = getNormalizedScheduleStatus(status);

  if (normalizedStatus === 'PUBLISHED') {
    return ['PUBLISHED', 'DRAFT'] satisfies WeeklyScheduleStatus[];
  }

  if (normalizedStatus === 'ARCHIVED') {
    return ['ARCHIVED', 'DRAFT'] satisfies WeeklyScheduleStatus[];
  }

  return ['DRAFT'] satisfies WeeklyScheduleStatus[];
}

function buildScheduleAssignmentChangeCellSet(changes: ScheduleAssignmentChange[]) {
  return new Set(
    changes.map((change) => getScheduleAssignmentChangeCellKey(change.employeeId, change.date)),
  );
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

function employeeRequiresPositionAssignment(employee?: Employee | null) {
  return employee?.requiresPositionAssignment ?? true;
}

function isPartTimeEmployee(employee: Employee) {
  return employee.employeeType === 'PART_TIME' || employee.jobTitle.includes('工讀生');
}

function getAssignmentPositionName(assignment: ScheduleAssignment) {
  return assignment.positionName ?? '';
}

function isRestPositionName(positionName?: string | null) {
  return positionName?.trim() === restPositionName;
}

function isNoPositionAssignmentPosition(position?: Position | null) {
  return Boolean(position && noPositionAssignmentPositionNames.includes(position.name.trim()));
}

function isRestAssignment(assignment: ScheduleAssignment, positionName?: string) {
  return isRestPositionName(positionName ?? getAssignmentPositionName(assignment));
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

function getLatestWeeklySchedule(schedules: WeeklySchedule[]) {
  return schedules.reduce<WeeklySchedule | null>((latestSchedule, schedule) => {
    if (!latestSchedule) {
      return schedule;
    }

    const startDateComparison = schedule.weekStartDate.localeCompare(
      latestSchedule.weekStartDate,
    );

    if (startDateComparison !== 0) {
      return startDateComparison > 0 ? schedule : latestSchedule;
    }

    const endDateComparison = schedule.weekEndDate.localeCompare(latestSchedule.weekEndDate);

    if (endDateComparison !== 0) {
      return endDateComparison > 0 ? schedule : latestSchedule;
    }

    return schedule.id > latestSchedule.id ? schedule : latestSchedule;
  }, null);
}

function compareWeeklySchedulesByLatest(
  firstSchedule: WeeklySchedule,
  secondSchedule: WeeklySchedule,
) {
  const startDateComparison = secondSchedule.weekStartDate.localeCompare(
    firstSchedule.weekStartDate,
  );

  if (startDateComparison !== 0) {
    return startDateComparison;
  }

  const endDateComparison = secondSchedule.weekEndDate.localeCompare(firstSchedule.weekEndDate);

  if (endDateComparison !== 0) {
    return endDateComparison;
  }

  return secondSchedule.id - firstSchedule.id;
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

    if (assignment.employeeId !== employeeId || assignment.date !== date) {
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

function MovieNoteDialog({
  open,
  title,
  initialValue,
  onClose,
  onSave,
}: MovieNoteDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) {
      const timeoutId = window.setTimeout(() => {
        setValue(initialValue);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [initialValue, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          label="上映電影"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          fullWidth
          multiline
          minRows={3}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={() => onSave(value)}>
          儲存
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SchedulePage() {
  const staffingCheckRequestIdRef = useRef(0);
  const workHoursRequestIdRef = useRef(0);
  const assignmentChangesRequestIdRef = useRef(0);
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [monthlyLeaves, setMonthlyLeaves] = useState<MonthlyLeave[]>([]);
  const [availabilityPreview, setAvailabilityPreview] = useState<Availability[]>([]);
  const [availabilityPreviewRefreshKey, setAvailabilityPreviewRefreshKey] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const [importingAvailability, setImportingAvailability] = useState(false);
  const [generatingFixedAssignments, setGeneratingFixedAssignments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffingCheckError, setStaffingCheckError] = useState<string | null>(null);
  const [shortageDateSet, setShortageDateSet] = useState<Set<string>>(() => new Set());
  const [understaffingResults, setUnderstaffingResults] = useState<StaffingCheckResult[]>([]);
  const [overstaffingRanges, setOverstaffingRanges] = useState<OverstaffingRange[]>([]);
  const [scheduleAssignmentChangeCellSet, setScheduleAssignmentChangeCellSet] = useState<
    Set<string>
  >(() => new Set());
  const [weeklyWorkHoursByEmployeeId, setWeeklyWorkHoursByEmployeeId] = useState<
    Record<number, string>
  >({});
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
  const [publishScheduleTarget, setPublishScheduleTarget] = useState<WeeklySchedule | null>(null);
  const [assignmentWarnings, setAssignmentWarnings] = useState<string[]>([]);
  const [pendingAssignmentPayload, setPendingAssignmentPayload] =
    useState<ScheduleAssignmentPayload | null>(null);
  const [pendingAssignmentTargetId, setPendingAssignmentTargetId] = useState<number | null>(null);
  const [pendingAssignmentAction, setPendingAssignmentAction] =
    useState<PendingAssignmentAction>('create');
  const [copiedAssignment, setCopiedAssignment] = useState<CopiedAssignment | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<WeeklySchedule | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<ScheduleAssignment | null>(null);
  const [cellActionTarget, setCellActionTarget] = useState<CellActionTarget | null>(null);
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<WeeklySchedule | null>(null);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] =
    useState<ScheduleAssignment | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [scheduleListFilter, setScheduleListFilter] = useState<ScheduleListFilter>('recent');
  const [scheduleMonthOverrides, setScheduleMonthOverrides] = useState<Record<string, string>>({});
  const [movieNotes, setMovieNotes] = useState<Record<string, string>>(getStoredMovieNotes);
  const [movieNoteDate, setMovieNoteDate] = useState<string | null>(null);
  const [assignmentNoteInputKey, setAssignmentNoteInputKey] = useState(0);
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

  const noPositionAssignmentPosition = useMemo(() => {
    return positions.find(isNoPositionAssignmentPosition) ?? null;
  }, [positions]);

  const getAssignmentDisplayPositionName = useCallback(
    (assignment: ScheduleAssignment) => {
      if (!assignment.positionId) {
        return '';
      }

      return positionNameById.get(assignment.positionId) ?? assignment.positionName ?? '';
    },
    [positionNameById],
  );

  const selectedSchedule = useMemo(() => {
    return weeklySchedules.find((schedule) => String(schedule.id) === selectedScheduleId) ?? null;
  }, [selectedScheduleId, weeklySchedules]);
  const sortedWeeklySchedules = useMemo(() => {
    return [...weeklySchedules].sort(compareWeeklySchedulesByLatest);
  }, [weeklySchedules]);
  const visibleWeeklySchedules = useMemo(() => {
    if (scheduleListFilter === 'all') {
      return sortedWeeklySchedules;
    }

    return sortedWeeklySchedules.slice(0, recentWeeklyScheduleCount);
  }, [scheduleListFilter, sortedWeeklySchedules]);
  const selectedScheduleStatus = selectedSchedule
    ? getNormalizedScheduleStatus(selectedSchedule.status)
    : '';
  const selectedScheduleIsDraft = selectedScheduleStatus === 'DRAFT';
  const selectedScheduleIsPublished = selectedScheduleStatus === 'PUBLISHED';

  const scheduleMonthKey = selectedScheduleId || 'default';
  const scheduleMonth =
    scheduleMonthOverrides[scheduleMonthKey] ?? getDefaultScheduleMonth(selectedSchedule);
  const scheduleTitle = `環球中華影城${scheduleMonth}月班表`;

  const selectedAssignmentEmployee = useMemo(() => {
    return employees.find((employee) => String(employee.id) === assignmentFormValues.employeeId)
      ?? null;
  }, [assignmentFormValues.employeeId, employees]);

  const selectedAssignmentPosition = useMemo(() => {
    return positions.find((position) => String(position.id) === assignmentFormValues.positionId)
      ?? null;
  }, [assignmentFormValues.positionId, positions]);

  const assignmentPositionRequired =
    employeeRequiresPositionAssignment(selectedAssignmentEmployee);
  const assignmentRestSelected = isRestPositionName(selectedAssignmentPosition?.name);
  const assignmentTimeRequired = !assignmentRestSelected;
  const assignmentPositionOptions = assignmentPositionRequired
    ? positions
    : positions.filter(
        (position) => isRestPositionName(position.name) || isNoPositionAssignmentPosition(position),
      );

  const scheduleDates = useMemo(() => {
    if (!selectedSchedule) {
      return [];
    }

    return getDatesBetween(selectedSchedule.weekStartDate, selectedSchedule.weekEndDate);
  }, [selectedSchedule]);

  const sortedEmployees = useMemo(() => {
    return sortEmployeesBySortOrder(employees);
  }, [employees]);

  const visibleAssignments = useMemo(() => {
    if (!selectedSchedule) {
      return assignments;
    }

    return assignments.filter((assignment) => {
      if (assignment.weeklyScheduleId === selectedSchedule.id) {
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
      const key = `${assignment.employeeId}-${assignment.date}`;
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
      const key = `${availability.employeeId}-${availability.date}`;
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
      setEmployees(getActiveEmployees(employeeData));
      setPositions(positionData);
      setSelectedScheduleId((currentScheduleId) => {
        const currentScheduleExists = scheduleData.some(
          (schedule) => String(schedule.id) === currentScheduleId,
        );

        if (currentScheduleExists) {
          return currentScheduleId;
        }

        const latestSchedule = getLatestWeeklySchedule(scheduleData);
        return latestSchedule ? String(latestSchedule.id) : '';
      });
      return scheduleData;
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshScheduleAssignmentChanges = useCallback(async (schedule: WeeklySchedule | null) => {
    if (!schedule || getNormalizedScheduleStatus(schedule.status) !== 'PUBLISHED') {
      assignmentChangesRequestIdRef.current += 1;
      setScheduleAssignmentChangeCellSet(new Set());
      return;
    }

    const requestId = assignmentChangesRequestIdRef.current + 1;
    assignmentChangesRequestIdRef.current = requestId;

    try {
      const changes =
        await scheduleAssignmentService.getScheduleAssignmentChangesByWeeklyScheduleId(schedule.id);

      if (requestId !== assignmentChangesRequestIdRef.current) {
        return;
      }

      setScheduleAssignmentChangeCellSet(buildScheduleAssignmentChangeCellSet(changes));
    } catch (changeLoadError) {
      if (requestId !== assignmentChangesRequestIdRef.current) {
        return;
      }

      setScheduleAssignmentChangeCellSet(new Set());
      setError(getErrorMessage(changeLoadError));
    }
  }, []);

  const refreshAssignments = useCallback(async (scheduleForChanges?: WeeklySchedule | null) => {
    const assignmentData = await scheduleAssignmentService.getScheduleAssignments();
    setAssignments(assignmentData);
    await refreshScheduleAssignmentChanges(scheduleForChanges ?? selectedSchedule);
  }, [refreshScheduleAssignmentChanges, selectedSchedule]);

  const refreshScheduleDataAfterStatusChange = useCallback(
    async (updatedSchedule: WeeklySchedule) => {
      const refreshedSchedules = await loadPageData();
      const refreshedSchedule =
        refreshedSchedules.find((schedule) => schedule.id === updatedSchedule.id)
        ?? updatedSchedule;

      if (String(refreshedSchedule.id) === selectedScheduleId) {
        await refreshScheduleAssignmentChanges(refreshedSchedule);
      }
    },
    [loadPageData, refreshScheduleAssignmentChanges, selectedScheduleId],
  );

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
          if (availability.weeklyScheduleId === schedule.id) {
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
      staffingCheckRequestIdRef.current += 1;
      setShortageDateSet(new Set());
      setUnderstaffingResults([]);
      setOverstaffingRanges([]);
      setStaffingCheckError(null);
      return;
    }

    const requestId = staffingCheckRequestIdRef.current + 1;
    staffingCheckRequestIdRef.current = requestId;

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

      if (requestId !== staffingCheckRequestIdRef.current) {
        return;
      }

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
      if (requestId !== staffingCheckRequestIdRef.current) {
        return;
      }

      setStaffingCheckError(getErrorMessage(checkError));
    }
  }, []);

  const loadWeeklyWorkHoursForSchedule = useCallback(
    async (schedule: WeeklySchedule | null, employeeList: Employee[]) => {
      if (!schedule) {
        workHoursRequestIdRef.current += 1;
        setWeeklyWorkHoursByEmployeeId({});
        return;
      }

      const partTimeEmployees = employeeList.filter(isPartTimeEmployee);

      if (partTimeEmployees.length === 0) {
        workHoursRequestIdRef.current += 1;
        setWeeklyWorkHoursByEmployeeId({});
        return;
      }

      const requestId = workHoursRequestIdRef.current + 1;
      workHoursRequestIdRef.current = requestId;

      try {
        const query = {
          startDate: schedule.weekStartDate,
          endDate: schedule.weekEndDate,
        };
        const summaries = await Promise.all(
          partTimeEmployees.map(async (employee) => {
            const summary = await workHourService.getEmployeeSummary(employee.id, query);
            return [employee.id, summary.hours] as const;
          }),
        );

        if (requestId !== workHoursRequestIdRef.current) {
          return;
        }

        setWeeklyWorkHoursByEmployeeId(Object.fromEntries(summaries));
      } catch {
        if (requestId !== workHoursRequestIdRef.current) {
          return;
        }

        setWeeklyWorkHoursByEmployeeId({});
      }
    },
    [],
  );

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
      void loadMonthlyLeavesForSchedule(selectedSchedule);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadMonthlyLeavesForSchedule, selectedSchedule]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAvailabilityPreviewForSchedule(selectedSchedule);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [availabilityPreviewRefreshKey, loadAvailabilityPreviewForSchedule, selectedSchedule]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshScheduleAssignmentChanges(selectedSchedule);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshScheduleAssignmentChanges, selectedSchedule]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchStaffingCheckResults(selectedSchedule);
      void loadWeeklyWorkHoursForSchedule(selectedSchedule, employees);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    assignments,
    fetchStaffingCheckResults,
    employees,
    loadWeeklyWorkHoursForSchedule,
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

  const handleOpenCreateAssignmentForCell = (employee: Employee, date: string) => {
    setEditingAssignment(null);
    setAssignmentWarnings([]);
    setPendingAssignmentPayload(null);
    setPendingAssignmentTargetId(null);
    setPendingAssignmentAction('create');
    setAssignmentFormValues({
      ...emptyAssignmentFormValues,
      weeklyScheduleId: selectedScheduleId,
      employeeId: String(employee.id),
      date,
    });
    setAssignmentNoteInputKey((current) => current + 1);
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
    setPendingAssignmentTargetId(null);
    setPendingAssignmentAction('create');
    setAssignmentFormValues({
      weeklyScheduleId: assignment.weeklyScheduleId ? String(assignment.weeklyScheduleId) : '',
      employeeId: String(assignment.employeeId),
      positionId: assignment.positionId ? String(assignment.positionId) : '',
      date: assignment.date,
      startTime: formatTime(assignment.startTime),
      endTime: formatTime(assignment.endTime),
      note: assignment.note ?? '',
    });
    setAssignmentNoteInputKey((current) => current + 1);
    setAssignmentFormOpen(true);
  };

  const handleOpenMovieNote = (date: string) => {
    setMovieNoteDate(date);
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
      setPendingAssignmentTargetId(null);
      setPendingAssignmentAction('create');
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
    (field: keyof Pick<AssignmentFormValues, 'date' | 'startTime' | 'endTime'>) =>
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
      setError('開始日期與結束日期為必填。');
      return;
    }

    if (payload.weekStartDate > payload.weekEndDate) {
      setError('開始日期不能晚於結束日期。');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const savedSchedule = editingSchedule
        ? await weeklyScheduleService.updateWeeklySchedule(editingSchedule.id, payload)
        : await weeklyScheduleService.createWeeklySchedule(payload);

      setWeeklySchedules((currentSchedules) => {
        const scheduleExists = currentSchedules.some((schedule) => schedule.id === savedSchedule.id);

        if (!scheduleExists) {
          return [...currentSchedules, savedSchedule];
        }

        return currentSchedules.map((schedule) =>
          schedule.id === savedSchedule.id ? savedSchedule : schedule,
        );
      });

      if (String(savedSchedule.id) === selectedScheduleId) {
        await refreshScheduleAssignmentChanges(savedSchedule);
      }

      setScheduleFormOpen(false);
      if (editingSchedule) {
        await refreshScheduleDataAfterStatusChange(savedSchedule);
      } else {
        await loadPageData();
      }
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPublishSchedule = async () => {
    if (!publishScheduleTarget) {
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const publishedSchedule = await weeklyScheduleService.publishWeeklySchedule(
        publishScheduleTarget,
      );

      setWeeklySchedules((currentSchedules) =>
        currentSchedules.map((schedule) =>
          schedule.id === publishedSchedule.id ? publishedSchedule : schedule,
        ),
      );
      setPublishScheduleTarget(null);
      setSnackbar({
        open: true,
        message: '班表發布成功',
        severity: 'success',
      });
      await refreshScheduleDataAfterStatusChange(publishedSchedule);
    } catch (publishError) {
      setError(getErrorMessage(publishError));
    } finally {
      setPublishing(false);
    }
  };

  const createAssignment = async (payload: ScheduleAssignmentPayload, successMessage?: string) => {
    await scheduleAssignmentService.createScheduleAssignment(payload);
    setAssignmentFormOpen(false);
    setCellActionTarget(null);
    setAssignmentWarnings([]);
    setPendingAssignmentPayload(null);
    setPendingAssignmentTargetId(null);
    setPendingAssignmentAction('create');
    if (successMessage) {
      setSnackbar({
        open: true,
        message: successMessage,
        severity: 'success',
      });
    }
    await refreshAssignments(selectedSchedule);
  };

  const updateAssignment = async (
    assignmentId: number,
    payload: ScheduleAssignmentPayload,
    successMessage?: string,
  ) => {
    await scheduleAssignmentService.updateScheduleAssignment(assignmentId, payload);
    setAssignmentFormOpen(false);
    setCellActionTarget(null);
    setAssignmentWarnings([]);
    setPendingAssignmentPayload(null);
    setPendingAssignmentTargetId(null);
    setPendingAssignmentAction('create');
    if (successMessage) {
      setSnackbar({
        open: true,
        message: successMessage,
        severity: 'success',
      });
    }
    await refreshAssignments(selectedSchedule);
  };

  const saveAssignmentAfterValidation = async (
    payload: ScheduleAssignmentPayload,
    action: PendingAssignmentAction,
    assignmentId: number | null,
    successMessage?: string,
  ) => {
    const validationResult = await scheduleAssignmentService.validateScheduleAssignment(payload);
    const validationErrorMessage = getAssignmentValidationErrorMessage(validationResult);

    if (validationErrorMessage) {
      throw new Error(validationErrorMessage);
    }

    const warnings = getAssignmentValidationWarnings(validationResult);

    if (warnings.length > 0) {
      setAssignmentWarnings(warnings);
      setPendingAssignmentPayload(payload);
      setPendingAssignmentTargetId(assignmentId);
      setPendingAssignmentAction(action);
      return;
    }

    if (assignmentId !== null) {
      await updateAssignment(assignmentId, payload, successMessage);
      return;
    }

    await createAssignment(payload, successMessage);
  };

  const handleSubmitAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const note = String(formData.get('note') ?? '').trim();
    const employeeId = Number(assignmentFormValues.employeeId);
    const positionId = Number(assignmentFormValues.positionId);
    const weeklyScheduleId = Number(assignmentFormValues.weeklyScheduleId);
    const payloadPositionId = positionId || (
      assignmentPositionRequired ? 0 : noPositionAssignmentPosition?.id ?? 0
    );
    const startTime = assignmentRestSelected
      ? restAssignmentStartTime
      : assignmentFormValues.startTime;
    const endTime = assignmentRestSelected
      ? restAssignmentEndTime
      : assignmentFormValues.endTime;

    if (
      !employeeId ||
      (assignmentPositionRequired && !positionId) ||
      !assignmentFormValues.date ||
      (assignmentTimeRequired && (!assignmentFormValues.startTime || !assignmentFormValues.endTime))
    ) {
      setError('員工、崗位、日期、開始時間與結束時間為必填。');
      return;
    }

    if (
      hasAssignmentConflict(
        assignments,
        editingAssignment?.id ?? null,
        employeeId,
        assignmentFormValues.date,
        startTime,
        endTime,
      )
    ) {
      setError('排班衝突：此員工已有重疊班段。');
      return;
    }

    const payload = buildScheduleAssignmentRequest({
      weeklyScheduleId,
      employeeId,
      positionId: payloadPositionId,
      date: assignmentFormValues.date,
      startTime,
      endTime,
      note,
    });

    setSaving(true);
    setError(null);

    try {
      if (editingAssignment) {
        await saveAssignmentAfterValidation(payload, 'update', editingAssignment.id);
      } else {
        await saveAssignmentAfterValidation(payload, 'create', null);
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
      setPendingAssignmentTargetId(null);
      setPendingAssignmentAction('create');
    }
  };

  const handleConfirmAssignmentWarning = async () => {
    if (!pendingAssignmentPayload) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const successMessage = pendingAssignmentAction === 'paste' ? '貼上成功' : undefined;

      if (pendingAssignmentTargetId !== null) {
        await updateAssignment(pendingAssignmentTargetId, pendingAssignmentPayload, successMessage);
      } else {
        await createAssignment(pendingAssignmentPayload, successMessage);
      }
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyAssignment = (assignment: ScheduleAssignment) => {
    setCopiedAssignment({
      positionId: assignment.positionId ?? null,
      startTime: formatTime(assignment.startTime),
      endTime: formatTime(assignment.endTime),
      note: assignment.note ?? '',
    });
    setSnackbar({
      open: true,
      message: '已複製排班',
      severity: 'success',
    });
  };

  const handlePasteAssignment = async (targetEmployeeId: number, targetDate: string) => {
    if (!copiedAssignment || !selectedSchedule) {
      return;
    }

    const targetEmployee = employees.find((employee) => employee.id === targetEmployeeId);
    const targetPositionRequired = employeeRequiresPositionAssignment(targetEmployee);
    const targetAssignments = assignmentGrid.get(`${targetEmployeeId}-${targetDate}`) ?? [];
    const targetAssignmentId = targetAssignments[0]?.id ?? null;
    const payloadPositionId = copiedAssignment.positionId
      || (targetPositionRequired ? 0 : noPositionAssignmentPosition?.id ?? 0);

    if (targetPositionRequired && !copiedAssignment.positionId) {
      setError('需要崗位的員工無法貼上未指定崗位的排班。');
      return;
    }

    if (
      hasAssignmentConflict(
        assignments,
        targetAssignmentId,
        targetEmployeeId,
        targetDate,
        copiedAssignment.startTime,
        copiedAssignment.endTime,
      )
    ) {
      setError('排班衝突：此員工已有重疊班段。');
      return;
    }

    const payload = buildScheduleAssignmentRequest({
      weeklyScheduleId: selectedSchedule.id,
      employeeId: targetEmployeeId,
      positionId: payloadPositionId,
      date: targetDate,
      startTime: copiedAssignment.startTime,
      endTime: copiedAssignment.endTime,
      note: copiedAssignment.note ?? '',
    });

    setSaving(true);
    setError(null);

    try {
      await saveAssignmentAfterValidation(payload, 'paste', targetAssignmentId, '貼上成功');
    } catch (pasteError) {
      setError(getErrorMessage(pasteError));
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
      await refreshAssignments(selectedSchedule);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMovieNote = (value: string) => {
    if (!movieNoteDate || !selectedScheduleId) {
      return;
    }

    const key = `${selectedScheduleId}-${movieNoteDate}`;
    const nextMovieNotes = {
      ...movieNotes,
      [key]: value.trim(),
    };

    if (!nextMovieNotes[key]) {
      delete nextMovieNotes[key];
    }

    setMovieNotes(nextMovieNotes);
    window.localStorage.setItem(movieNotesStorageKey, JSON.stringify(nextMovieNotes));
    setMovieNoteDate(null);
  };

  const handleAvailabilityImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;

    if (selectedFile && !selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      setAvailabilityImportFile(null);
      setSnackbar({
        open: true,
        message: '請選擇 .xlsx 檔案。',
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
        message: '請選擇週排班。',
        severity: 'error',
      });
      return;
    }

    if (!availabilityImportFile) {
      setSnackbar({
        open: true,
        message: '請選擇 Excel 檔案。',
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
      setAvailabilityPreviewRefreshKey((current) => current + 1);
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
        message: '請選擇週排班。',
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
      await refreshAssignments(selectedSchedule);
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
      setError('找不到班表匯出區域。');
      return;
    }

    const sourceTitle = sourceExportArea.querySelector<HTMLElement>('[data-schedule-export-title]');
    const sourceTable = sourceExportArea.querySelector<HTMLTableElement>('[data-schedule-export-table]');

    if (!sourceTitle || !sourceTable) {
      setError('找不到班表匯出內容。');
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
      tableClone.style.minWidth = '0';

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
          min-width: 0 !important;
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

  const copiedAssignmentPositionName = copiedAssignment?.positionId
    ? positionNameById.get(copiedAssignment.positionId) ?? ''
    : '';
  const copiedAssignmentText = copiedAssignment
    ? isRestPositionName(copiedAssignmentPositionName)
      ? restPositionName
      : `${copiedAssignment.startTime}-${copiedAssignment.endTime}${
          copiedAssignmentPositionName ? `／${copiedAssignmentPositionName}` : ''
        }`
    : '';

  return (
    <Stack
      spacing={4}
      onContextMenu={(event) => {
        if (!copiedAssignment) {
          return;
        }

        event.preventDefault();
        setCopiedAssignment(null);
      }}
    >
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
            週排班管理
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            管理週排班、員工班別與影城崗位安排。
          </Typography>
        </Box>

        <Tooltip title="重新整理班表">
          <span>
            <IconButton onClick={loadPageData} disabled={loading || saving}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Stack spacing={1} sx={{ minHeight: 52, justifyContent: 'center' }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {staffingCheckError ? (
          <Alert severity="warning">
            Staffing check results could not be loaded: {staffingCheckError}
          </Alert>
        ) : null}
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
            <Typography variant="h5" component="h3">
              週排管理
            </Typography>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="schedule-list-filter-label">顯示範圍</InputLabel>
              <Select
                labelId="schedule-list-filter-label"
                label="顯示範圍"
                value={scheduleListFilter}
                onChange={(event) =>
                  setScheduleListFilter(event.target.value as ScheduleListFilter)
                }
              >
                <MenuItem value="recent">最近五週班表</MenuItem>
                <MenuItem value="all">所有班表</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateSchedule}>
            新增週排
          </Button>
        </Stack>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>編號</TableCell>
                <TableCell>開始日期</TableCell>
                <TableCell>結束日期</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleWeeklySchedules.map((schedule, scheduleIndex) => (
                <TableRow key={schedule.id} hover>
                  <TableCell>{scheduleIndex + 1}</TableCell>
                  <TableCell>{schedule.weekStartDate}</TableCell>
                  <TableCell>{schedule.weekEndDate}</TableCell>
                  <TableCell>
                    <Chip
                      label={getScheduleStatusLabel(schedule.status)}
                      color={getStatusColor(schedule.status)}
                      size="small"
                      variant={schedule.status === 'DRAFT' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="編輯週排班">
                      <IconButton
                        aria-label="edit weekly schedule"
                        onClick={() => handleOpenEditSchedule(schedule)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="刪除週排班">
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
                    目前沒有週排班資料。
                  </TableCell>
                </TableRow>
              ) : null}

              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    載入週排班中...
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
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={3}
            sx={{ alignItems: { xs: 'stretch', lg: 'center' } }}
          >
            <Box>
              <Typography variant="h5" component="h3">
                班表
              </Typography>
              {selectedSchedule ? (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.75 }}>
                  <Typography color="text.secondary" variant="body2">
                    目前狀態
                  </Typography>
                  <Chip
                    label={getScheduleStatusLabel(selectedSchedule.status)}
                    color={getStatusColor(selectedSchedule.status)}
                    size="small"
                    variant={selectedScheduleIsDraft ? 'outlined' : 'filled'}
                  />
                </Stack>
              ) : null}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormControl sx={{ minWidth: { xs: '100%', sm: 280 } }}>
                <InputLabel id="schedule-board-week-label">週排班</InputLabel>
                <Select
                  labelId="schedule-board-week-label"
                  label="週排班"
                  value={selectedScheduleId}
                  onChange={(event) => setSelectedScheduleId(event.target.value)}
                >
                  {sortedWeeklySchedules.map((schedule) => (
                    <MenuItem key={schedule.id} value={String(schedule.id)}>
                      {schedule.weekStartDate} 至 {schedule.weekEndDate}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="班表月份"
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
                {availabilityImportFile ? availabilityImportFile.name : '尚未選擇檔案'}
              </Typography>
              <Button
                variant="contained"
                onClick={() => void handleImportAvailabilityExcel()}
                disabled={importingAvailability || !selectedScheduleId || !availabilityImportFile}
              >
                {importingAvailability ? '匯入中...' : '匯入工讀生休假'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => void handleGenerateFixedAssignments()}
                disabled={generatingFixedAssignments || !selectedSchedule}
              >
                {generatingFixedAssignments ? '產生中...' : '產生正職時間'}
              </Button>
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
          >
            {selectedScheduleIsDraft ? (
              <Button
                variant="contained"
                color="success"
                startIcon={<PublishIcon />}
                onClick={() => setPublishScheduleTarget(selectedSchedule)}
                disabled={publishing || saving}
                sx={{ minHeight: 56 }}
              >
                {publishing ? '發布中...' : '發布班表'}
              </Button>
            ) : null}
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => void exportScheduleImage()}
              disabled={loading || exportingImage}
              sx={{ minHeight: 56 }}
            >
              {exportingImage ? '匯出中...' : '匯出圖片'}
            </Button>
          </Stack>
        </Stack>

        {copiedAssignment ? (
          <Alert
            severity="info"
            data-html2canvas-ignore="true"
            action={
              <Button color="inherit" size="small" onClick={() => setCopiedAssignment(null)}>
                取消複製
              </Button>
            }
          >
            已複製：{copiedAssignmentText}，請點選目標欄位貼上
          </Alert>
        ) : null}

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
              minWidth: `calc(${scheduleStickyColumnWidth * 2 + scheduleWorkHourColumnWidth}px + ${
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
                  職稱
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
                  姓名
                </TableCell>
                <TableCell
                  align="center"
                  rowSpan={2}
                  data-html2canvas-ignore="true"
                  sx={{
                    width: scheduleWorkHourColumnWidth,
                    minWidth: scheduleWorkHourColumnWidth,
                    bgcolor: 'grey.100',
                    fontWeight: 700,
                    position: 'sticky',
                    left: scheduleStickyColumnWidth * 2,
                    zIndex: 3,
                    whiteSpace: 'nowrap',
                  }}
                >
                  工時
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
              {selectedSchedule && sortedEmployees.map((employee, employeeIndex) => (
                <TableRow key={employee.id} hover>
                  {(() => {
                    const isMovieNoteRow = employeeIndex === 0;
                    const shouldShowWorkHours = !isMovieNoteRow && isPartTimeEmployee(employee);
                    const workHours = weeklyWorkHoursByEmployeeId[employee.id];

                    return (
                      <>
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
                  <TableCell
                    align="center"
                    data-html2canvas-ignore="true"
                    sx={{
                      bgcolor: 'background.paper',
                      position: 'sticky',
                      left: scheduleStickyColumnWidth * 2,
                      zIndex: 2,
                      whiteSpace: 'nowrap',
                      color: shouldShowWorkHours ? 'text.secondary' : 'text.disabled',
                      fontWeight: shouldShowWorkHours ? 600 : 400,
                    }}
                  >
                    {shouldShowWorkHours ? (workHours && workHours !== '-' ? `${workHours} 小時` : '-') : ''}
                  </TableCell>
                  {scheduleDates.map((date) => {
                    if (isMovieNoteRow) {
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
                    }

                    const cellAssignments = assignmentGrid.get(`${employee.id}-${date}`) ?? [];
                    const monthlyLeave = monthlyLeaveGrid.get(`${employee.id}-${date}`);
                    const previewAvailability =
                      availabilityPreviewGrid.get(`${employee.id}-${date}`) ?? [];
                    const restAvailability = previewAvailability.find(isRestAvailability);
                    const hasRestDay = Boolean(monthlyLeave || restAvailability);
                    const restDayLabel = monthlyLeave
                      ? getLeaveTypeLabel(monthlyLeave.leaveType, 'schedule')
                      : restPositionName;
                    const hasRestAssignment = cellAssignments.some((assignment) => {
                      const positionName = getAssignmentDisplayPositionName(assignment);
                      return isRestAssignment(assignment, positionName);
                    });
                    const hasPublishedChange =
                      selectedScheduleIsPublished
                      && scheduleAssignmentChangeCellSet.has(
                        getScheduleAssignmentChangeCellKey(employee.id, date),
                      );

                    return (
                      <TableCell
                        key={date}
                        align="center"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (copiedAssignment) {
                            void handlePasteAssignment(employee.id, date);
                            return;
                          }

                          handleOpenCellActions(employee, date, cellAssignments);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            if (copiedAssignment) {
                              void handlePasteAssignment(employee.id, date);
                              return;
                            }

                            handleOpenCellActions(employee, date, cellAssignments);
                          }
                        }}
                        sx={{
                          position: 'relative',
                          minWidth: scheduleDateColumnMinWidth,
                          bgcolor: hasPublishedChange
                            ? publishedChangeCellColor
                            : hasRestAssignment
                            ? restCellColor
                            : cellAssignments.length > 0
                            ? 'background.paper'
                            : hasRestDay
                              ? restCellColor
                              : 'grey.50',
                          backgroundImage: hasPublishedChange
                            ? 'repeating-linear-gradient(135deg, rgba(211, 47, 47, 0.08) 0, rgba(211, 47, 47, 0.08) 6px, transparent 6px, transparent 12px)'
                            : undefined,
                          cursor: copiedAssignment ? 'copy' : 'pointer',
                          transition: 'background-color 120ms ease',
                          px: 1,
                          py: 0.5,
                          '&:hover': {
                            bgcolor: copiedAssignment
                              ? '#e3f2fd'
                              : hasPublishedChange
                                ? publishedChangeCellHoverColor
                              : hasRestAssignment
                                ? restCellColor
                                : cellAssignments.length > 0
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
                              const restAssignment = isRestAssignment(assignment, positionName);

                              return (
                                <Box
                                  key={assignment.id}
                                  data-staffing-highlight={
                                    !restAssignment && isOverstaffed ? 'overstaffing' : undefined
                                  }
                                  sx={{
                                    borderRadius: 1,
                                    bgcolor: restAssignment
                                      ? restCellColor
                                      : isOverstaffed
                                      ? overstaffingAssignmentColor
                                      : 'transparent',
                                    px: 0.5,
                                    py: 0,
                                    '&:hover': {
                                      bgcolor: restAssignment
                                        ? restCellColor
                                        : isOverstaffed
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
                                          fontWeight: 480,
                                          lineHeight: 1.35,
                                          whiteSpace: 'nowrap',
                                          color: restAssignment ? restTextColor : 'text.primary',
                                        }}
                                      >
                                        {restAssignment
                                          ? restPositionName
                                          : `${formatCompactTime(assignment.startTime)}-${formatCompactTime(
                                              assignment.endTime,
                                            )}${positionName ? `  ${positionName}` : ''}`}
                                      </Typography>
                                    </Box>
                                    <Stack
                                      direction="row"
                                      spacing={0}
                                      data-html2canvas-ignore="true"
                                    >
                                      <Tooltip title="複製班段">
                                        <IconButton
                                          aria-label="copy assignment from board"
                                          size="small"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            handleCopyAssignment(assignment);
                                          }}
                                          sx={{ p: 0, ml: 0.25 }}
                                        >
                                          <ContentCopyIcon sx={{ fontSize: 13 }} />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="編輯班段">
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
                                      <Tooltip title="刪除班段">
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
                            {restDayLabel}
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
                      </>
                    );
                  })()}
                </TableRow>
              ))}

              {!loading && selectedSchedule && sortedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3 + scheduleDates.length}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    目前沒有員工資料。
                  </TableCell>
                </TableRow>
              ) : null}

              {!loading && !selectedSchedule ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    請選擇或新增週排班以查看班表。
                  </TableCell>
                </TableRow>
              ) : null}

              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={Math.max(3 + scheduleDates.length, 3)}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    載入班表中...
                  </TableCell>
                </TableRow>
              ) : null}

              {selectedSchedule ? (
                <>
                  <TableRow data-html2canvas-ignore="true">
                    <TableCell
                      align="center"
                      colSpan={3}
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
                      colSpan={3}
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
                          <Box
                            sx={{
                              minHeight: 96,
                              display: 'flex',
                              alignItems: dateResults.length > 0 ? 'flex-start' : 'center',
                              justifyContent: 'center',
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
                          </Box>
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
          <DialogTitle>{editingSchedule ? '編輯週排' : '新增週排'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="開始日期"
                type="date"
                value={scheduleFormValues.weekStartDate}
                onChange={handleScheduleDateChange('weekStartDate')}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="結束日期"
                type="date"
                value={scheduleFormValues.weekEndDate}
                onChange={handleScheduleDateChange('weekEndDate')}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControl fullWidth required>
                <InputLabel id="weekly-schedule-status-label">狀態</InputLabel>
                <Select
                  labelId="weekly-schedule-status-label"
                  label="狀態"
                  value={scheduleFormValues.status}
                  onChange={(event) =>
                    setScheduleFormValues((current) => ({
                      ...current,
                      status: event.target.value as WeeklyScheduleStatus,
                    }))
                  }
                >
                  {getEditableScheduleStatuses(scheduleFormValues.status).map((status) => (
                    <MenuItem key={status} value={status}>
                      {getScheduleStatusLabel(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {getNormalizedScheduleStatus(scheduleFormValues.status) === 'DRAFT' ? (
                <Typography color="text.secondary" variant="body2">
                  草稿仍可編輯與排班；要正式發布請使用班表上方的「發布班表」按鈕。
                </Typography>
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseScheduleForm} disabled={saving}>
              取消
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? '儲存中...' : '儲存'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={assignmentFormOpen} onClose={handleCloseAssignmentForm} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmitAssignment}>
          <DialogTitle>{editingAssignment ? '編輯排班' : '指派員工'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControl fullWidth>
                <InputLabel id="assignment-week-label">週排班</InputLabel>
                <Select
                  labelId="assignment-week-label"
                  label="週排班"
                  value={assignmentFormValues.weeklyScheduleId}
                  onChange={(event) =>
                    setAssignmentFormValues((current) => ({
                      ...current,
                      weeklyScheduleId: event.target.value,
                    }))
                  }
                >
                  <MenuItem value="">未選擇週排班</MenuItem>
                  {sortedWeeklySchedules.map((schedule, scheduleIndex) => (
                    <MenuItem key={schedule.id} value={String(schedule.id)}>
                      {scheduleIndex + 1} - {schedule.weekStartDate} 至 {schedule.weekEndDate}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel id="assignment-employee-label">員工</InputLabel>
                <Select
                  labelId="assignment-employee-label"
                  label="員工"
                  value={assignmentFormValues.employeeId}
                  onChange={(event) =>
                    setAssignmentFormValues((current) => {
                      const nextEmployee = employees.find(
                        (employee) => String(employee.id) === event.target.value,
                      );
                      const nextEmployeeNeedsPosition =
                        employeeRequiresPositionAssignment(nextEmployee);
                      const currentPosition = positions.find(
                        (position) => String(position.id) === current.positionId,
                      );
                      const keepCurrentPosition =
                        nextEmployeeNeedsPosition
                        || isRestPositionName(currentPosition?.name)
                        || isNoPositionAssignmentPosition(currentPosition);

                      return {
                        ...current,
                        employeeId: event.target.value,
                        positionId: keepCurrentPosition ? current.positionId : '',
                      };
                    })
                  }
                >
                  {sortedEmployees.map((employee) => (
                    <MenuItem key={employee.id} value={String(employee.id)}>
                      {employee.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required={assignmentPositionRequired}>
                <InputLabel id="assignment-position-label">崗位</InputLabel>
                <Select
                  labelId="assignment-position-label"
                  label="崗位"
                  value={assignmentFormValues.positionId}
                  onChange={(event) => {
                    const nextPosition = positions.find(
                      (position) => String(position.id) === event.target.value,
                    );
                    const nextIsRestPosition = isRestPositionName(nextPosition?.name);

                    setAssignmentFormValues((current) => {
                      const currentIsRestPosition = isRestPositionName(
                        selectedAssignmentPosition?.name,
                      );

                      return {
                        ...current,
                        positionId: event.target.value,
                        startTime: nextIsRestPosition
                          ? restAssignmentStartTime
                          : currentIsRestPosition
                            ? ''
                            : current.startTime,
                        endTime: nextIsRestPosition
                          ? restAssignmentEndTime
                          : currentIsRestPosition
                            ? ''
                            : current.endTime,
                      };
                    });
                  }}
                >
                  {!assignmentPositionRequired ? (
                    <MenuItem value="">不需要指定崗位</MenuItem>
                  ) : null}
                  {assignmentPositionOptions.map((position) => (
                    <MenuItem key={position.id} value={String(position.id)}>
                      {position.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="日期"
                type="date"
                value={assignmentFormValues.date}
                onChange={handleAssignmentChange('date')}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <FormControl fullWidth required={assignmentTimeRequired} disabled={assignmentRestSelected}>
                  <InputLabel id="assignment-start-hour-label">開始小時</InputLabel>
                  <Select
                    labelId="assignment-start-hour-label"
                    label="開始小時"
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
                      小時
                    </MenuItem>
                    {scheduleHourOptions.map((hour) => (
                      <MenuItem key={hour} value={hour}>
                        {hour}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth required={assignmentTimeRequired} disabled={assignmentRestSelected}>
                  <InputLabel id="assignment-start-minute-label">開始分鐘</InputLabel>
                  <Select
                    labelId="assignment-start-minute-label"
                    label="開始分鐘"
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
                      分鐘
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
                <FormControl fullWidth required={assignmentTimeRequired} disabled={assignmentRestSelected}>
                  <InputLabel id="assignment-end-hour-label">結束小時</InputLabel>
                  <Select
                    labelId="assignment-end-hour-label"
                    label="結束小時"
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
                      小時
                    </MenuItem>
                    {scheduleHourOptions.map((hour) => (
                      <MenuItem key={hour} value={hour}>
                        {hour}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth required={assignmentTimeRequired} disabled={assignmentRestSelected}>
                  <InputLabel id="assignment-end-minute-label">結束分鐘</InputLabel>
                  <Select
                    labelId="assignment-end-minute-label"
                    label="結束分鐘"
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
                      分鐘
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
                key={assignmentNoteInputKey}
                label="備註"
                name="note"
                defaultValue={assignmentFormValues.note}
                fullWidth
                multiline
                minRows={3}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAssignmentForm} disabled={saving}>
              取消
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? '儲存中...' : '儲存'}
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
            {saving
              ? '儲存中...'
              : pendingAssignmentAction === 'paste'
                ? '仍然貼上'
                : '仍然排班'}
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
            : '班段'}
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
                      {isRestAssignment(assignment, getAssignmentDisplayPositionName(assignment))
                        ? restPositionName
                        : `${formatTime(assignment.startTime)}-${formatTime(assignment.endTime)} ${getAssignmentDisplayPositionName(
                            assignment,
                          )}`}
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
                      startIcon={<ContentCopyIcon />}
                      onClick={() => {
                        handleCopyAssignment(assignment);
                        setCellActionTarget(null);
                      }}
                    >
                      複製
                    </Button>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => {
                        handleOpenEditAssignment(assignment);
                        setCellActionTarget(null);
                      }}
                    >
                      編輯
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
                      刪除
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCellActionTarget(null)}>關閉</Button>
          {cellActionTarget && cellActionTarget.assignments.length === 0 ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateAssignmentFromCellActions}
            >
              新增班段
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <MovieNoteDialog
        open={Boolean(movieNoteDate)}
        title={`電影資訊 ${
          movieNoteDate ? `- ${formatDateLabel(movieNoteDate)} ${formatWeekday(movieNoteDate)}` : ''
        }`}
        initialValue={movieNoteDate ? movieNotes[`${selectedScheduleId}-${movieNoteDate}`] ?? '' : ''}
        onClose={() => setMovieNoteDate(null)}
        onSave={handleSaveMovieNote}
      />

      <Dialog
        open={Boolean(publishScheduleTarget)}
        onClose={() => {
          if (!publishing) {
            setPublishScheduleTarget(null);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>發布班表</DialogTitle>
        <DialogContent>
          <Typography>
            發布後，之後修改的班表格子會以淡紅色標示。確定要發布此班表嗎？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishScheduleTarget(null)} disabled={publishing}>
            取消
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => void handleConfirmPublishSchedule()}
            disabled={publishing || !publishScheduleTarget}
          >
            {publishing ? '發布中...' : '確認發布'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteScheduleTarget)}
        onClose={() => setDeleteScheduleTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>刪除週排</DialogTitle>
        <DialogContent>
          <Typography>
            確定要刪除 {deleteScheduleTarget?.weekStartDate} 至 {deleteScheduleTarget?.weekEndDate} 的週排班嗎？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteScheduleTarget(null)} disabled={saving}>
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDeleteSchedule}
            disabled={saving}
          >
            刪除
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteAssignmentTarget)}
        onClose={() => setDeleteAssignmentTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>刪除排班</DialogTitle>
        <DialogContent>
          <Typography>
            確定要刪除 {deleteAssignmentTarget?.employeeName} 在 {deleteAssignmentTarget?.date} 的班段嗎？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAssignmentTarget(null)} disabled={saving}>
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDeleteAssignment}
            disabled={saving}
          >
            刪除
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
