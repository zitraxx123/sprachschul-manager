import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Calculates end time based on start time string (e.g. "18:00") and duration in decimal hours (e.g. 1.5).
 * Example: calculateEndTime("18:00", 1.5) => "19:30"
 */
export function calculateEndTime(startTime: string, durationHours: number): string {
  if (!startTime) return "";
  const parts = startTime.split(":");
  const startH = parseInt(parts[0], 10);
  const startM = parseInt(parts[1] || "0", 10);
  if (isNaN(startH)) return startTime;

  const durationMin = Math.round((Number(durationHours) || 1) * 60);
  const totalStartMin = startH * 60 + (isNaN(startM) ? 0 : startM);
  const totalEndMin = totalStartMin + durationMin;

  const endH = Math.floor(totalEndMin / 60) % 24;
  const endM = totalEndMin % 60;

  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

/**
 * Returns formatted time range string: "18:00 - 19:30".
 */
export function formatTimeRange(startTime: string, durationHours: number): string {
  if (!startTime) return "";
  const endTime = calculateEndTime(startTime, durationHours);
  return `${startTime} - ${endTime}`;
}
