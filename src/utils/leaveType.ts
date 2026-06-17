import type { LeaveType } from '../types/monthlyLeave';

export const defaultLeaveType: LeaveType = 'REGULAR_LEAVE';

export const leaveTypeOptions: Array<{ value: LeaveType; label: string }> = [
  { value: 'REGULAR_LEAVE', label: '月休' },
  { value: 'ANNUAL_LEAVE', label: '特休' },
];

type LeaveTypeLabelVariant = 'management' | 'schedule';

const leaveTypeLabels: Record<LeaveTypeLabelVariant, Record<LeaveType, string>> = {
  management: {
    REGULAR_LEAVE: '月休',
    ANNUAL_LEAVE: '特休',
  },
  schedule: {
    REGULAR_LEAVE: '休',
    ANNUAL_LEAVE: '特休',
  },
};

export function normalizeLeaveType(leaveType?: string | null): LeaveType {
  return leaveType === 'ANNUAL_LEAVE' ? 'ANNUAL_LEAVE' : defaultLeaveType;
}

export function getLeaveTypeLabel(
  leaveType?: string | null,
  variant: LeaveTypeLabelVariant = 'schedule',
) {
  return leaveTypeLabels[variant][normalizeLeaveType(leaveType)];
}
