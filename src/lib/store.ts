"use client";

// Everything is stored in the browser (IndexedDB) so the demo needs no account or server database.
import { createStore, del, get, set, values } from "idb-keyval";
import { DEFAULT_OFFICE, type Office, type Property } from "./types";

const props = typeof window !== "undefined" ? createStore("aqar-pro", "properties") : undefined;
const meta = typeof window !== "undefined" ? createStore("aqar-pro-meta", "meta") : undefined;

export async function listProperties(): Promise<Property[]> {
  const all = (await values<Property>(props)) ?? [];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export const getProperty = (id: string) => get<Property>(id, props);

export async function saveProperty(p: Property): Promise<void> {
  await set(p.id, { ...p, updatedAt: Date.now() }, props);
}

export const deleteProperty = (id: string) => del(id, props);

export async function getOffice(): Promise<Office> {
  return { ...DEFAULT_OFFICE, ...((await get<Office>("office", meta)) ?? {}) };
}

export const saveOffice = (o: Office) => set("office", o, meta);

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Downscale an image file to a JPEG data URL so photos stay small in browser storage. */
export function compressImage(file: File, max = 1600, quality = 0.82): Promise<string> {
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
