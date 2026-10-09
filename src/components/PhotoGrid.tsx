"use client";

/* eslint-disable @next/next/no-img-element -- photos are served by our own API */
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { useState } from "react";
import { compressImage, deletePhoto, reorderPhotos, uploadPhoto } from "@/lib/store";
import type { Photo } from "@/lib/types";

const MAX = 12;

export default function PhotoGrid({
  propertyId,
  group,
  photos,
  onChange,
  coverLabel,
}: {
  propertyId: string;
  group: "property" | "building";
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  coverLabel?: string;
}) {
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX - photos.length);
    e.target.value = "";
    if (!files.length) return;
    setError("");
    setUploading(files.length);
    let list = photos;
    for (const f of files) {
      try {
        const ph = await uploadPhoto(propertyId, group, await compressImage(f));
        list = [...list, ph];
        onChange(list);
      } catch (err) {
        setError((err as Error).message);
      }
      setUploading((n) => n - 1);
    }
  }

  async function remove(ph: Photo) {
    onChange(photos.filter((x) => x.id !== ph.id));
    await deletePhoto(ph.id).catch(() => setError("تعذر حذف الصورة"));
  }

  async function makeFirst(ph: Photo) {
    const next = [ph, ...photos.filter((x) => x.id !== ph.id)];
    onChange(next);
    await reorderPhotos(propertyId, next.map((x) => x.id)).catch(() => setError("تعذر حفظ الترتيب"));
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((ph, i) => (
          <div key={ph.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-background">
            <img src={ph.url} alt="" className="h-full w-full object-cover" />
            {i === 0 && coverLabel && <span className="absolute top-2 right-2 rounded-full bg-navy/90 px-2 py-0.5 text-[11px] text-white">{coverLabel}</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 p-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
              {i > 0 && (
                <button type="button" onClick={() => makeFirst(ph)} className="flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs">
                  <Star className="h-3 w-3" /> {coverLabel ? "غلاف" : "الأولى"}
                </button>
              )}
              <button type="button" onClick={() => remove(ph)} className="mr-auto rounded-lg bg-white/90 p-1 text-red-700" aria-label="حذف">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={`u${i}`} className="grid aspect-[4/3] place-items-center rounded-xl border border-line bg-background text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ))}
        {photos.length + uploading < MAX && (
          <label className="grid aspect-[4/3] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-muted transition hover:border-gold hover:text-foreground">
            <span className="text-center text-sm">
              <ImagePlus className="mx-auto mb-1 h-6 w-6" />
              إضافة صور
            </span>
            <input type="file" accept="image/*" multiple onChange={add} className="hidden" />
          </label>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </>
  );
}
