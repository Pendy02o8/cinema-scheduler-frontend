import type { Employee } from '../types/employee';

type EmployeeType = NonNullable<Employee['employeeType']>;
type FixedShiftType = NonNullable<Employee['fixedShiftType']>;

export const employeeTypeLabelMap: Record<EmployeeType, string> = {
  FULL_TIME: '正職',
  PART_TIME: '工讀生',
  CLEANER: '清潔人員',
};

export const fixedShiftLabelMap: Record<FixedShiftType, string> = {
  MORNING: '早班',
  EVENING: '晚班',
  NONE: '-',
};

export function getEmployeeTypeLabel(employeeType?: Employee['employeeType']) {
  return employeeType ? employeeTypeLabelMap[employeeType] : '-';
}

export function getFixedShiftLabel(fixedShiftType?: Employee['fixedShiftType']) {
  return fixedShiftType ? fixedShiftLabelMap[fixedShiftType] : '-';
}
