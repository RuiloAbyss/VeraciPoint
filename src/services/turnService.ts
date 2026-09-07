// src/services/turnService.ts
import { invoke } from "@tauri-apps/api/core";

export const checkActiveTurn = async (employeeId: number): Promise<boolean> => {
  return await invoke("check_turn_status", { employeeId });
};

export const openTurn = async (employeeId: number, startMoney: number): Promise<number> => {
  return await invoke("open_cash_register", { employeeId, startMoney });
};

export const closeTurn = async (turnId: number, endMoney: number): Promise<void> => {
  return await invoke("close_cash_register", { turnId, endMoney });
};