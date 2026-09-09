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

export interface Sale {
  id: number;
  employeeName: string;
  date: string;
  cash: boolean;
  total: number;
}

export interface SaleDetail {
  id: number;
  productName: string;
  quantity: number;
  subtotal: number;
}

export async function fetchSalesHistory(): Promise<Sale[]> {
  const raw = await invoke<any[]>("get_sales_history");
  return (raw || []).map((s) => ({
    id: s.id,
    employeeName: s.employeeName || s.employee_name || "Desconocido",
    date: s.date || "",
    cash: Boolean(s.cash),
    total: Number(s.total) || 0,
  }));
}

export async function fetchSaleDetails(ventaId: number): Promise<SaleDetail[]> {
  const raw = await invoke<any[]>("get_sale_details", { ventaId });
  return (raw || []).map((d) => ({
    id: d.id,
    productName: d.productName || d.product_name || "Producto Eliminado",
    quantity: Number(d.quantity) || 0,
    subtotal: Number(d.subtotal) || 0,
  }));
}