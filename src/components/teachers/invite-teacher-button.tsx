"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createTeacherInviteLink } from "@/actions/teacher-invites";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, X, Copy, Loader2 } from "lucide-react";

export function InviteTeacherButton({ teacherId }: { teacherId: string }) {
  const t = useTranslations("teachers");
  const tCommon = useTranslations("common");
  const [link, setLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const generate = () => {
    startTransition(async () => {
      const res = await createTeacherInviteLink(teacherId);
      if (res.error) {
        toast.error(t(res.error));
      } else if (res.link) {
        setLink(res.link);
      }
    });
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("inviteCopied"));
    } catch {
      toast.error(t("inviteCopyFailed"));
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={generate}
        disabled={isPending}
        className="space-x-1 text-xs"
      >
        {isPending ? (
          <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" />
        ) : (
          <UserPlus strokeWidth={1.5} className="w-4 h-4" />
        )}
        <span>{t("inviteButton")}</span>
      </Button>

      {link && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("inviteTitle")}</h2>
              <button
                type="button"
                onClick={() => setLink(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label={tCommon("close")}
              >
                <X strokeWidth={1.5} className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("inviteHint")}</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="text-xs" />
              <Button type="button" size="sm" onClick={copy} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                <Copy strokeWidth={1.5} className="w-4 h-4 mr-1" />
                {t("inviteCopy")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
