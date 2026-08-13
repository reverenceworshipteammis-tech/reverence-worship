export const MAX_QUESTION_IMAGES = 5;
export const MAX_QUESTION_IMAGE_BYTES = 3 * 1024 * 1024;
export const QUESTION_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export type IntercessionQuestionImage = {
  id: string;
  path: string;
  alt: string;
  caption: string;
};

export function isManagedQuestionImagePath(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;

  if (value.startsWith("/uploads/forms/") && !value.includes("..")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      url.pathname.startsWith("/uploads/forms/");
  } catch {
    return false;
  }
}

export function parseQuestionImages(value: unknown): IntercessionQuestionImage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const image = item as Record<string, unknown>;
      if (!isManagedQuestionImagePath(image.path)) return null;

      return {
        id: typeof image.id === "string" && image.id ? image.id.slice(0, 100) : `image-${index + 1}`,
        path: image.path,
        alt: typeof image.alt === "string" ? image.alt.trim().slice(0, 500) : "",
        caption: typeof image.caption === "string" ? image.caption.trim().slice(0, 500) : "",
      };
    })
    .filter((image): image is IntercessionQuestionImage => image !== null)
    .slice(0, MAX_QUESTION_IMAGES);
}

export function questionImagePaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((question) => {
    if (!question || typeof question !== "object" || Array.isArray(question)) return [];
    return parseQuestionImages((question as Record<string, unknown>).images).map((image) => image.path);
  });
}
