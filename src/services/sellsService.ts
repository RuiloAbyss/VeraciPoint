import { invoke } from "@tauri-apps/api/core";

export interface SaleDetailInput {
  productId: number;
  quantity: number;
  subtotal: number;
}

export const registerSale = async (
  employeeId: number,
  cash: boolean,
  total: number,
  details: SaleDetailInput[]
): Promise<number> => {
  return await invoke("register_new_sale", {
    employeeId,
    cash,
    total,
    details,
  });
};