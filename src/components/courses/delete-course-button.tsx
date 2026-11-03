"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteCourse } from "@/actions/courses";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const t = useTranslations("courses");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (confirm(t("deleteConfirm"))) {
      startTransition(async () => {
        try {
          await deleteCourse(courseId);
          toast.success(t("deletedSuccess"));
        } catch {
          toast.error(t("deleteError"));
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
      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
      title={tCommon("delete")}
    >
      {isPending ? (
        <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin text-slate-400" />
      ) : (
        <Trash2 strokeWidth={1.5} className="w-4 h-4" />
      )}
    </Button>
  );
}
