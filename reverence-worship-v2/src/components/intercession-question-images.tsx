"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { parseQuestionImages, type IntercessionQuestionImage } from "@/lib/intercession-question-images";

export function IntercessionQuestionImages({
  images,
  className = "",
}: {
  images: IntercessionQuestionImage[];
  className?: string;
}) {
  const safeImages = parseQuestionImages(images);
  const [selectedImage, setSelectedImage] = useState<IntercessionQuestionImage | null>(null);

  useEffect(() => {
    if (!selectedImage) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setSelectedImage(null); }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedImage]);

  if (safeImages.length === 0) return null;

  return (
    <>
      <div className={`grid gap-3 ${safeImages.length === 1 ? "grid-cols-1" : "grid-cols-2"} ${className}`}>
        {safeImages.map((image, index) => (
          <figure
            key={image.id}
            className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm ${
              safeImages.length === 3 && index === 0 ? "col-span-2" : ""
            }`}
          >
            <button type="button" onClick={() => setSelectedImage(image)} className="group block w-full text-left focus:outline-none focus:ring-4 focus:ring-inset focus:ring-blue-100" aria-label={`Enlarge question image ${index + 1}`}>
            <span className={`relative block ${safeImages.length === 1 ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
              <Image
                src={image.path}
                alt={image.alt || `Question image ${index + 1}`}
                fill
                sizes={safeImages.length === 1 ? "(min-width: 1024px) 800px, 95vw" : "(min-width: 1024px) 400px, 48vw"}
                className="object-contain transition duration-200 group-hover:scale-[1.02]"
              />
            </span>
            </button>
            {image.caption ? <figcaption className="border-t border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">{image.caption}</figcaption> : null}
          </figure>
        ))}
      </div>

      {selectedImage ? (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Question image preview"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedImage(null);
          }}
        >
          <div className="relative h-[85vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-black shadow-2xl">
            <Image
              src={selectedImage.path}
              alt={selectedImage.alt || "Question image preview"}
              fill
              sizes="95vw"
              className="object-contain"
              priority
            />
            <button
              type="button"
              autoFocus
              onClick={() => setSelectedImage(null)}
              className="absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black"
              aria-label="Close image preview"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            {selectedImage.caption ? <p className="absolute inset-x-0 bottom-0 bg-black/70 px-4 py-3 text-center text-sm text-white">{selectedImage.caption}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
