import { invoke } from "@tauri-apps/api/core";

export interface ReportEvent {
  id: number;
  description: string;
  type: string;
  employee: string;
  date: string;
  time: string;
}

export async function fetchReports(): Promise<ReportEvent[]> {
  try {
    const data = await invoke<ReportEvent[]>("fetch_reports");
    return data;
  } catch (error) {
    console.error("Error fetching reports:", error);
    throw error;
  }
}

export async function registerManualEvent(description: string, employeeId: number, eventType: string): Promise<void> {
  try {
    await invoke("register_manual_event", { description, employeeId, eventType });
  } catch (error) {
    console.error("Error registering manual event:", error);
    throw error;
  }
}