"use client";

// Browser-side access to the server API. Everything is stored in the office's database.
import type { Comparable, Distance, Landmark, Office, Photo, Property, Street } from "./types";

async function call<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "حدث خطأ، حاول مرة أخرى");
  return data as T;
}

export const listProperties = () => call<Property[]>("/api/properties");
export const getProperty = (id: string) => call<Property>(`/api/properties/${id}`).catch(() => null);
export const createProperty = (sample = false) => call<{ id: string }>("/api/properties", { method: "POST", json: { sample } });
export const saveProperty = (p: Property) => call<{ ok: true }>(`/api/properties/${p.id}`, { method: "PUT", json: p });
export const deleteProperty = (id: string) => call<{ ok: true }>(`/api/properties/${id}`, { method: "DELETE" });

export const uploadPhoto = (propertyId: string, group: "property" | "building", dataUrl: string) =>
  call<Photo>(`/api/properties/${propertyId}/photos`, { method: "POST", json: { group, dataUrl } });
export const deletePhoto = (id: number) => call<{ ok: true }>(`/api/photos/${id}`, { method: "DELETE" });
export const reorderPhotos = (propertyId: string, ids: number[]) => call<{ ok: true }>(`/api/properties/${propertyId}/photos`, { method: "PATCH", json: { ids } });

export const getOffice = () => call<Office>("/api/office");
export const saveOffice = (o: Office) => call<Office>("/api/office", { method: "PUT", json: o });

export const listComparables = (city?: string) => call<Comparable[]>(`/api/comparables${city ? `?city=${encodeURIComponent(city)}` : ""}`);
export const addComparable = (c: Omit<Comparable, "id">) => call<Comparable>("/api/comparables", { method: "POST", json: c });
export const updateComparable = (c: Comparable) => call<Comparable>(`/api/comparables/${c.id}`, { method: "PUT", json: c });
export const deleteComparable = (id: number) => call<{ ok: true }>(`/api/comparables/${id}`, { method: "DELETE" });

export const listLandmarks = (city?: string) => call<Landmark[]>(`/api/landmarks${city ? `?city=${encodeURIComponent(city)}` : ""}`);
export const addLandmark = (l: Omit<Landmark, "id">) => call<Landmark>("/api/landmarks", { method: "POST", json: l });
export const deleteLandmark = (id: number) => call<{ ok: true }>(`/api/landmarks/${id}`, { method: "DELETE" });

export const fetchDistances = (lat: number, lon: number, city: string) => call<Distance[]>("/api/geo/distances", { method: "POST", json: { lat, lon, city } });
export const fetchStreets = (lat: number, lon: number) => call<Street[]>("/api/geo/streets", { method: "POST", json: { lat, lon } });

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

/** Downscale an image file to a JPEG data URL before uploading. */
export function compressImage(file: File, max = 1800, quality = 0.84): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
