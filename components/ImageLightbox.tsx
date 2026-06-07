"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  images: string[];
  initialIndex?: number;
  onClose?: () => void;

  // 🔥 ADAUGĂ ASTA
  onDelete?: (img: string) => void;
};

export default function ImageLightbox({
  images,
  initialIndex = 0,
  onClose,
  onDelete, // 🔥 ADAUGĂ ASTA
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  useEffect(() => {
  if (images.length === 0) {
    onClose?.();
    return;
  }

  if (index >= images.length) {
    setIndex(images.length - 1);
  }
}, [images, index]);
useEffect(() => {
  if (!images.length) return;

  if (index > images.length - 1) {
    setIndex((prev) => Math.max(0, images.length - 1));
  }
}, [images.length]);
  const startX = useRef<number | null>(null);

  const current = images[index];

  const hasImages = images?.length > 0;

  const next = () => {
    if (!hasImages) return;
    setIndex((i) => (i + 1) % images.length);
  };

  const prev = () => {
    if (!hasImages) return;
    setIndex((i) => (i - 1 + images.length) % images.length);
  };

  const close = () => {
    onClose?.();
  };

  // 🧠 keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images]);

  // 🧠 swipe support (mobile)
  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (startX.current === null) return;

    const diff = e.clientX - startX.current;

    // threshold swipe
    if (diff > 50) prev();
    if (diff < -50) next();

    startX.current = null;
  };

  if (!hasImages) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-md flex items-center justify-center"
      onClick={close}
    >
      {/* CLOSE BUTTON */}
      <button
        className="absolute top-4 right-4 text-white text-2xl"
        onClick={close}
      >
        ✕
      </button>
      <button
  className="absolute top-4 right-16 text-white text-2xl"
  onClick={(e) => {
    e.stopPropagation();

    const ok = confirm("Sigur vrei să ștergi această imagine?");
    if (!ok) return;

    onDelete?.(current);
  }}
>
  🗑
</button>

      {/* LEFT ARROW */}
      <button
        className="absolute left-4 text-white text-4xl select-none"
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
      >
        ‹
      </button>

      {/* IMAGE */}
      <div
        className="max-w-5xl max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <img
          src={current}
          alt="lightbox"
          className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-lg"
          draggable={false}
        />
      </div>

      {/* RIGHT ARROW */}
      <button
        className="absolute right-4 text-white text-4xl select-none"
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
      >
        ›
      </button>

      {/* COUNTER */}
      <div className="absolute bottom-4 text-white text-sm opacity-70">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}