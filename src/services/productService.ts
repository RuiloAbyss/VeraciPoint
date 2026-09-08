import { invoke } from "@tauri-apps/api/core";

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  barcode: number | null;
  sellformat: string | null;
  stock: number;
  minStock: number | null;
  maxStock: number | null;
  status: number;
  photo: string | null;
}

export interface SaleDetailInput {
  productName: string;
  quantity: number;
  subtotal: number;
}

export async function registerSale(
  employeeId: number,
  cash: boolean,
  total: number,
  details: SaleDetailInput[]
): Promise<number> {
  return await invoke<number>("register_sale", {
    employeeId,
    cash,
    total,
    details,
  });
}

export async function fetchProducts(): Promise<Product[]> {
  const raw = await invoke<any[]>("get_all_products");
  
  // Mapeo defensivo para soportar tanto camelCase como snake_case desde Rust
  return (raw || []).map((p) => ({
    id: p.id,
    name: p.name || "",
    price: Number(p.price) || 0,
    category: p.category || "Sin Categoría",
    barcode: p.barcode ?? null,
    sellformat: p.sellformat || p.sell_format || "Pieza",
    stock: Number(p.stock ?? p.quantity) || 0,
    minStock: p.minStock !== undefined ? p.minStock : (p.min_stock ?? null),
    maxStock: p.maxStock !== undefined ? p.maxStock : (p.max_stock ?? null),
    status: p.status !== undefined ? Number(p.status) : 1,
    photo: p.photo || p.photoBase64 || null,
  }));
}

export async function createProduct(
  name: string,
  price: number,
  category: string,
  barcode: number | null,
  sellformat: string,
  quantity: number,
  minStock?: number | null,
  maxStock?: number | null
): Promise<number> {
  return await invoke<number>("create_item", {
    name,
    price,
    category,
    barcode: barcode ?? null,
    sellformat,
    quantity,
    minStock: minStock ?? null,
    maxStock: maxStock ?? null,
  });
}

export async function editProduct(
  id: number,
  name: string,
  price: number,
  barcode: number | null,
  category: string,
  sellformat: string,
  minStock?: number | null,
  maxStock?: number | null
): Promise<void> {
  await invoke("edit_item", {
    id,
    name,
    price,
    barcode: barcode ?? null,
    category,
    sellformat,
    minStock: minStock ?? null,
    maxStock: maxStock ?? null,
  });
}

export async function activateProduct(id: number): Promise<void> {
  await invoke("activate_item", { id });
}

export async function deactivateProduct(id: number): Promise<void> {
  await invoke("deactivate_item", { id });
}

export async function restockProduct(id: number, qty: number): Promise<void> {
  await invoke("restock_item", { id, qty });
}

export async function discardStock(id: number, qty: number): Promise<void> {
  await invoke("discard_item_stock", { id, qty });
}

export async function uploadPhoto(id: number, base64: string): Promise<void> {
  await invoke("upload_item_photo", { id, base64 });
}

export async function deleteProductHard(id: number): Promise<void> {
  await invoke("delete_item_hard", { id });
}