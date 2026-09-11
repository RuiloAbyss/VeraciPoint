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
  products?: string;
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

export interface SaleFlow {
  hour: number;
  count: number;
  total: number;
}

export interface SaleFlowByDay {
  date: string;
  count: number;
  total: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  total: number;
}

export async function fetchSalesFlow(startDate: string, endDate: string): Promise<SaleFlow[]> {
  const raw = await invoke<any[]>("get_sales_flow", { startDate, endDate });
  return (raw || []).map(r => ({
     hour: Number(r.hour) || 0,
     count: Number(r.count) || 0,
     total: Number(r.total) || 0,
  }));
}

export async function fetchSalesFlowByDay(startDate: string, endDate: string): Promise<SaleFlowByDay[]> {
  const raw = await invoke<any[]>("get_sales_flow_by_day", { startDate, endDate });
  return (raw || []).map(r => ({
     date: r.date || "",
     count: Number(r.count) || 0,
     total: Number(r.total) || 0,
  }));
}

export async function fetchTopProducts(startDate: string, endDate: string): Promise<TopProduct[]> {
  const raw = await invoke<any[]>("get_top_products", { startDate, endDate });
  return (raw || []).map(r => ({
     name: r.name || "Desconocido",
     category: r.category || "Sin Categoría",
     quantity: Number(r.quantity) || 0,
     total: Number(r.total) || 0,
  }));
}