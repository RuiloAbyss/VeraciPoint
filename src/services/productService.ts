import { invoke } from "@tauri-apps/api/core";

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  barcode: string | null; 
  sellformat: string;
  stock: number;
  minStock: number | null;
  maxStock: number | null;
  status: number;
  photo: string | null;
}

export const fetchProducts = async (): Promise<Product[]> => {
  return await invoke("get_all_products");
};

export const restockProduct = async (id: number, qty: number): Promise<void> => {
  return await invoke("restock_item", { id, qty });
};

export const deactivateProduct = async (id: number): Promise<void> => {
  return await invoke("deactivate_item", { id });
};

export const activateProduct = async (id: number): Promise<void> => {
  return await invoke("activate_item", { id });
};

export const discardStock = async (id: number, qty: number): Promise<void> => {
  return await invoke("discard_item_stock", { id, qty });
};

export const uploadPhoto = async (id: number, base64: string): Promise<void> => {
  return await invoke("upload_item_photo", { id, base64 });
};

export const editProduct = async (
  id: number,
  name: string,
  price: number,
  barcode: string | null,
  category: string,
  sellformat: string,
  minStock: number | null,
  maxStock: number | null
): Promise<void> => {
  return await invoke("edit_item", {
    id,
    name,
    price,
    barcode,
    category,
    sellformat,
    min_stock: minStock,
    max_stock: maxStock,
  });
};

export const createProduct = async (
  name: string,
  price: number,
  category: string,
  barcode: string | null,
  sellformat: string,
  quantity: number,
  minStock: number | null,
  maxStock: number | null
): Promise<number> => {
  return await invoke("create_item", {
    name,
    price,
    category,
    barcode,
    sellformat,
    quantity,
    min_stock: minStock,
    max_stock: maxStock,
  });
};