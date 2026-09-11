import { invoke } from "@tauri-apps/api/core";

export interface Banner {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  photo: string;
}

export async function fetchBanners(onlyActive: boolean = true): Promise<Banner[]> {
  return await invoke("fetch_banners", { onlyActive });
}

export async function createBanner(title: string, startDate: string, endDate: string, photo: string): Promise<void> {
  await invoke("create_banner", { title, startDate, endDate, photo });
}

export async function editBanner(id: number, title: string, startDate: string, endDate: string, photo?: string | null): Promise<void> {
  await invoke("update_banner", { id, title, startDate, endDate, photo });
}

export async function deleteBanner(id: number): Promise<void> {
  await invoke("delete_banner", { id });
}