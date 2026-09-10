import { invoke } from "@tauri-apps/api/core";

export interface Employee {
  id: number;
  name: string;
  lastname: string;
  username: string;
  isAdmin: boolean;
  status: boolean;
}

export interface Shift {
  shiftId: number;
  employeeId: number;
  employeeName: string;
  startTime: string;
  endTime: string;
  daysCovered: string;
}

export const getEmployees = async (): Promise<Employee[]> => invoke("fetch_employees");
export const saveEmployee = async (data: any): Promise<void> => invoke("save_employee", data);
export const toggleEmployee = async (id: number, status: boolean): Promise<void> => invoke("toggle_employee", { id, status });
export const getShifts = async (): Promise<Shift[]> => invoke("fetch_shifts");
export const saveShift = async (data: any): Promise<void> => invoke("save_shift", data);