"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { startCheckout, openBillingPortal } from "@/actions/billing";

export function UpgradeButton({ plan, label }: { plan: string; label: string }) {
  const t = useTranslations("plan");
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await startCheckout(plan);
          if (res.url) {
            window.location.href = res.url;
          } else {
            toast.error(t(res.error || "billingFailed"));
          }
        })
      }
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      {isPending && <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-1 animate-spin" />}
      {label}
    </Button>
  );
}

export function ManageBillingButton() {
  const t = useTranslations("plan");
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await openBillingPortal();
          if (res.url) {
            window.location.href = res.url;
          } else {
            toast.error(t(res.error || "billingFailed"));
          }
        })
      }
      className="space-x-1"
    >
      {isPending ? <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" /> : <CreditCard strokeWidth={1.5} className="w-4 h-4" />}
      <span>{t("manageBilling")}</span>
    </Button>
  );
}
