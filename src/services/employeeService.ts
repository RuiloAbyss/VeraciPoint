import { invoke } from "@tauri-apps/api/core";

export interface Employee {
  id: number;
  name: string;
  lastname: string;
  username: string;
  isAdmin: boolean;
  status: boolean;
  createdAt: string;
}

export interface Shift {
  shiftId: number;
  employeeId: number;
  employeeName: string;
  startTime: string;
  endTime: string;
  daysCovered: string;
}

export interface Attendance {
  date: string;
  clockIn: string;
  isDayOff: boolean;
}

export const getEmployees = async (): Promise<Employee[]> => invoke("fetch_employees");
export const saveEmployee = async (data: any): Promise<void> => invoke("save_employee", data);
export const toggleEmployee = async (id: number, status: boolean): Promise<void> => invoke("toggle_employee", { id, status });
export const getShifts = async (): Promise<Shift[]> => invoke("fetch_shifts");
export const saveShift = async (data: any): Promise<void> => invoke("save_shift", data);
export const getAttendance = async (empId: number, startDate: string, endDate: string): Promise<Attendance[]> => invoke("get_attendance", { empId, startDate, endDate });
export const toggleDayOff = async (empId: number, date: string): Promise<void> => invoke("toggle_day_off", { empId, date });
export const clockIn = async (empId: number): Promise<void> => invoke("register_clock_in", { empId });