import { invoke } from "@tauri-apps/api/core";

export interface Order {
  orderId: number;
  categoryId: string;
  provider: string;
  employee: string;
  status: 'Generada' | 'Pagada' | 'Cancelada';
  paymentMethod: string | null;
  total: number;
  cashRegisterAmount: number;
  externalFundAmount: number;
  createdAt: string;
  completedAt: string;
}

export interface OrderDetail {
  productId: number;
  name: string;
  expectedQty: number;
  receivedQty: number | null;
  unitCost: number;
  subtotal: number;
}

export interface Provider {
  id: string;
  name: string;
  description: string;
  cellphone: string;
  status: boolean;
}

export const addProvider = async (name: string, description: string | null, cellphone: string | null): Promise<void> => 
  invoke("add_provider", { name, description, cellphone });
export const editProvider = async (id: string, name: string, description: string | null, cellphone: string | null): Promise<void> => 
  invoke("edit_provider", { id, name, description, cellphone });
export const fetchProviders = async (): Promise<Provider[]> => invoke("fetch_providers");
export const toggleProvider = async (name: string, currentStatus: boolean): Promise<void> => invoke("toggle_provider", { name, currentStatus });

export const fetchOrders = async (): Promise<Order[]> => invoke("fetch_orders");
export const fetchOrderDetails = async (orderId: number): Promise<OrderDetail[]> => invoke("fetch_order_details", { orderId });
export const registerOrder = async (catId: string, empId: number, total: number, details: any[]): Promise<number> => invoke("register_order", { catId, empId, total, details });
export const updateOrderStatus = async (orderId: number, empId: number, status: string, method: string | null, total: number, registerCash: number, externalFund: number, details: any[]): Promise<void> => invoke("update_order_status", { orderId, empId, status, method, total, registerCash, externalFund, details });