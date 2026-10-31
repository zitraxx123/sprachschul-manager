import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
        <FileQuestion className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Seite nicht gefunden (404)</h1>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        Die von Ihnen gesuchte Seite konnte nicht gefunden werden.
      </p>
      <Link href="/dashboard">
        <Button>Zurück zum Dashboard</Button>
      </Link>
    </div>
  );
}
