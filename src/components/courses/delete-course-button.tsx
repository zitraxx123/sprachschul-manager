"use client";

import { useTransition } from "react";
import { deleteCourse } from "@/actions/courses";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (confirm("Möchten Sie diesen Kurs wirklich löschen?")) {
      startTransition(async () => {
        try {
          await deleteCourse(courseId);
          toast.success("Kurs erfolgreich gelöscht.");
        } catch {
          toast.error("Fehler beim Löschen des Kurses.");
        }
      });
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isPending}
      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
      title="Kurs löschen"
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </Button>
  );
}
