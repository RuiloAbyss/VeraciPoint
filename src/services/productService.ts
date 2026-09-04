import { invoke } from "@tauri-apps/api/core";

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  barcode: number | null;
  sellformat: string | null;
  stock: number;
  photo?: string | null;
}

export const fetchProducts = async (): Promise<Product[]> => invoke("get_all_products");
export const restockProduct = async (id: number, qty: number): Promise<void> => invoke("restock_item", { id, qty });
export const deactivateProduct = async (id: number): Promise<void> => invoke("deactivate_item", { id });
export const discardStock = async (id: number, qty: number): Promise<void> => invoke("discard_item_stock", { id, qty });
export const uploadPhoto = async (id: number, base64: string): Promise<void> => invoke("upload_item_photo", { id, base64 });

export const editProduct = async (id: number, name: string, price: number, barcode: number | null, category: string, sellformat: string): Promise<void> => 
  invoke("edit_item", { id, name, price, barcode, category, sellformat });

export const createProduct = async (name: string, price: number, category: string, barcode: number | null, sellformat: string, quantity: number): Promise<number> => 
  invoke("create_item", { name, price, category, barcode, sellformat, quantity });