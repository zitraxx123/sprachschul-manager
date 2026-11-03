"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Users, UserPlus, Trash2, Copy, Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { inviteAssistant, removeAssistant, cancelInvite, type TeamData } from "@/actions/team";

export function TeamCard({ team }: { team: TeamData }) {
  const t = useTranslations("team");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const invite = () => {
    startTransition(async () => {
      const res = await inviteAssistant(email);
      if (res.error) {
        toast.error(t(res.error));
      } else if (res.link) {
        setLink(res.link);
        setEmail("");
      }
    });
  };

  const remove = (membershipId: string, mail: string) => {
    if (!confirm(t("removeConfirm", { email: mail }))) return;
    startTransition(async () => {
      const res = await removeAssistant(membershipId);
      if (res.error) toast.error(t(res.error));
      else toast.success(t("removed"));
    });
  };

  const cancel = (id: string) => {
    startTransition(async () => {
      const res = await cancelInvite(id);
      if (res.error) toast.error(t(res.error));
    });
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("linkCopyFailed"));
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start space-x-3">
          <Users strokeWidth={1.5} className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("title")}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("hint")}</p>
          </div>
        </div>

        {(team.assistants.length > 0 || team.invites.length > 0) && (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
            {team.assistants.map((a) => (
              <li key={a.membershipId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="truncate text-slate-800 dark:text-slate-200">{a.email}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() => remove(a.membershipId, a.email)}
                  title={t("remove")}
                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                >
                  <Trash2 strokeWidth={1.5} className="w-4 h-4" />
                </Button>
              </li>
            ))}
            {team.invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="truncate text-slate-500 dark:text-slate-400">
                  {i.email} <span className="text-xs">({t("pending")})</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() => cancel(i.id)}
                  title={t("cancelInvite")}
                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                >
                  <X strokeWidth={1.5} className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1 flex-1">
            <Label htmlFor="assistant-email" className="text-xs">{t("emailLabel")}</Label>
            <Input
              id="assistant-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
            />
          </div>
          <Button type="button" variant="outline" onClick={invite} disabled={isPending || !email.trim()} className="space-x-1">
            {isPending ? (
              <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus strokeWidth={1.5} className="w-4 h-4" />
            )}
            <span>{t("inviteButton")}</span>
          </Button>
        </div>

        {link && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-3 space-y-2">
            <p className="text-xs text-slate-700 dark:text-slate-300">{t("linkHint")}</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={link} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" variant="outline" size="sm" onClick={copy} className="space-x-1 shrink-0">
                <Copy strokeWidth={1.5} className="w-4 h-4" />
                <span>{t("copy")}</span>
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLink(null)} className="shrink-0">
                {tCommon("close")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
