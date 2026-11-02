import React from "react";
import { CalendarPlus } from "lucide-react";

export function GoogleCalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <CalendarPlus className={className} strokeWidth={1.5} />;
}
