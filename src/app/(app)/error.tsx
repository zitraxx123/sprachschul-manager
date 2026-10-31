"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4 shadow-sm">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Ein Fehler ist aufgetreten</h2>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        {error.message || "Die angeforderte Seite konnte nicht geladen werden."}
      </p>
      <Button onClick={() => reset()} variant="default">
        Erneut versuchen
      </Button>
    </div>
  );
}
