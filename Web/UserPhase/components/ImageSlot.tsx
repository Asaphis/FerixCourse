"use client";
import { useState } from "react";
import { ImagePlus } from "lucide-react";

/* Small image slot for the hero wall.
   Drop the matching file into Web/UserPhase/public/images/ and it appears.
   Until then a designed placeholder shows — never a broken image. */
export default function ImageSlot({ src, label, hint }: { src: string; label: string; hint: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[.03] p-4 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
          <ImagePlus size={17} className="text-amber-200/80" />
        </span>
        <p className="text-[12.5px] font-bold">{label}</p>
        <p className="font-mono text-[10.5px] leading-relaxed text-stone-500">{hint}</p>
      </div>
    );
  }
  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/12 bg-stone-900">
      <img src={src} alt={label} onError={() => setFailed(true)}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      <span className="absolute bottom-2 left-2 rounded-lg bg-black/65 px-2.5 py-1 text-[11px] font-bold backdrop-blur">{label}</span>
    </div>
  );
}
