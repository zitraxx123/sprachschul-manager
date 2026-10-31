"use client";

import { useTransition } from "react";
import { deleteLesson } from "@/actions/lessons";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteLessonButton({ lessonId }: { lessonId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (confirm("Möchten Sie diese Unterrichtsstunde wirklich löschen?")) {
      startTransition(async () => {
        await deleteLesson(lessonId);
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
      title="Stunde löschen"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
    </Button>
  );
}
