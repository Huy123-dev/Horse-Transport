import { useAppStore } from "@/store/app-store";

const BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/+$/, "");
const API_ORIGIN = new URL(BASE, typeof window === "undefined" ? "http://localhost" : window.location.origin).origin;

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseHasApiPrefix = /\/api$/i.test(BASE);
  const pathHasApiPrefix = /^\/api(?:\/|$)/i.test(normalizedPath);

  if (baseHasApiPrefix && pathHasApiPrefix) {
    return `${BASE}${normalizedPath.slice(4)}`;
  }
  if (!baseHasApiPrefix && !pathHasApiPrefix) {
    return `${BASE}/api${normalizedPath}`;
  }
  return `${BASE}${normalizedPath}`;
}

function errorMessage(data: unknown, status: number): string {
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const body = data as { error?: unknown; message?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return body.error;
    if (typeof body.message === "string" && body.message.trim()) return body.message;
  }
  return `Lỗi ${status}`;
}

function clearSessionOnUnauthorized(status: number): void {
  if (status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    useAppStore.getState().setUser(null);
  }
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

export async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;

  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (options?.body != null && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined" && !headers.has("Authorization")) {
    const token = getStoredToken();
    if (token) {
      headers.set("Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
    }
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    clearSessionOnUnauthorized(response.status);
    throw new ApiError(errorMessage(data, response.status), response.status, data);
  }

  return data as T;
}

export async function apiDownloadFile(path: string, fileName: string): Promise<void> {
  const headers = new Headers({ Accept: "application/octet-stream" });
  if (typeof window !== "undefined") {
    const token = getStoredToken();
    if (token) headers.set("Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
  }

  const response = await fetch(apiUrl(path), { headers });
  if (!response.ok) {
    const text = await response.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) as unknown : null;
    } catch {
      data = text;
    }
    clearSessionOnUnauthorized(response.status);
    throw new ApiError(errorMessage(data, response.status), response.status, data);
  }
  if (typeof document === "undefined") {
    throw new Error("Tải tệp chỉ khả dụng trên trình duyệt.");
  }

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const apiGet = <T = any>(path: string) => api<T>(path);
export const apiPost = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiPostFormData = <T = any>(path: string, body: FormData) =>
  api<T>(path, { method: "POST", body });
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiPostFormData<{ url: string }>("/files/upload", formData);
  if (typeof response?.url !== "string" || response.url.trim() === "") {
    throw new ApiError("Không nhận được đường dẫn file hợp lệ.", 502, response);
  }
  return response.url;
}

export async function uploadHorseImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiPostFormData<{ url: string }>("/horses/images", formData);
  if (typeof response?.url !== "string" || response.url.trim() === "") {
    throw new ApiError("Không nhận được đường dẫn ảnh ngựa hợp lệ.", 502, response);
  }
  return response.url;
}

export function resolvePublicImageUrl(value: string): string | null {
  try {
    const url = new URL(value, API_ORIGIN);
    if (
      url.origin !== API_ORIGIN ||
      !url.pathname.startsWith("/uploads/") ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export const apiPut = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiPatch = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiDelete = <T = any>(path: string) =>
  api<T>(path, { method: "DELETE" });
