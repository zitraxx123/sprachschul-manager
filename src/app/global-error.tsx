"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error:", error);
  }, [error]);

  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-md">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Systemfehler</h2>
          <p className="text-sm text-slate-500 mb-6">
            Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Neu laden
          </button>
        </div>
      </body>
    </html>
  );
}
