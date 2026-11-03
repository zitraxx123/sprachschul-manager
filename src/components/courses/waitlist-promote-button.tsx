"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, UserCheck } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { promoteFromWaitlist, WaitlistActionState } from "@/actions/waitlist";

interface WaitlistPromoteButtonProps {
  courseId: string;
  /** Number of students that can move up right now (free places, limited by the waiting list) */
  count: number;
}

export function WaitlistPromoteButton({ courseId, count }: WaitlistPromoteButtonProps) {
  const t = useTranslations("courses");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function errorMessage(res: WaitlistActionState): string {
    switch (res.errorCode) {
      case "forbidden":
        return t("waitlistForbidden");
      case "full":
        return t("waitlistFull");
      case "nobody":
        return t("waitlistNobody");
      case "notFound":
        return t("waitlistNotFound");
      default:
        return t("waitlistDb", { detail: res.detail || "" });
    }
  }

  function handleClick() {
    startTransition(async () => {
      const res = await promoteFromWaitlist(courseId);
      if (res.success) {
        toast.success(t("waitlistPromoted", { names: (res.names || []).join(", ") }));
        router.refresh();
      } else {
        toast.error(errorMessage(res));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors cursor-pointer disabled:opacity-60 w-fit"
    >
      {isPending ? (
        <Loader2 strokeWidth={1.5} className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <UserCheck strokeWidth={1.5} className="w-3.5 h-3.5" />
      )}
      <span>{t("promoteWaitlist", { count })}</span>
    </button>
  );
}
