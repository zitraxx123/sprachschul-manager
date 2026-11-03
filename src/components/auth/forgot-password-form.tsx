"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Mail, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export function ForgotPasswordForm({ linkError }: { linkError?: boolean }) {
  const t = useTranslations("auth");
  const [state, action, isPending] = useActionState<AuthState | null, FormData>(
    requestPasswordReset,
    null
  );

  const errorKey = state?.error || (linkError ? "errorLinkExpired" : null);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm mb-3">
          <KeyRound strokeWidth={1.5} className="w-6 h-6" />
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
            {t("forgotTitle")}
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            {t("forgotDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorKey && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-sm text-red-700 dark:text-red-300">
              <AlertCircle strokeWidth={1.5} className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{t(errorKey)}</span>
            </div>
          )}

          {state?.success ? (
            <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-900 flex items-start space-x-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle2 strokeWidth={1.5} className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{t("forgotSent")}</span>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                  <Mail strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                  <span>{t("email")}</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("emailPlaceholder")}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-2 animate-spin" />
                    {t("forgotSending")}
                  </>
                ) : (
                  t("forgotButton")
                )}
              </Button>
            </form>
          )}

          <Link
            href="/login"
            className="mt-4 flex items-center justify-center space-x-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          >
            <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
            <span>{t("backToLogin")}</span>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
