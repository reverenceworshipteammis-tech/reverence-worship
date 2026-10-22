import { redirect } from "next/navigation";

export type LegacyFormSearchParams = Record<string, string | string[] | undefined>;

export function redirectLegacyFormsPage(path: string, params: LegacyFormSearchParams): never {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.append(key, value);
  }
  const suffix = query.toString();
  redirect(suffix ? `${path}?${suffix}` : path);
}
