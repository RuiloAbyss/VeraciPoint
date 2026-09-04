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
export const uploadPhoto = async (id: number, base64: string): Promise<void> => invoke("upload_item_photo", { id, base64 });
