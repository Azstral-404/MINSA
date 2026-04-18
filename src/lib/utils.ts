// Helper to build ISO date string from year, month (0-based), and day
export const buildISODate = (
  year: number | undefined,
  month: number | undefined, // 0‑11
  day: number | undefined
): string | undefined => {
  if (year == null || month == null || day == null) return undefined;
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
