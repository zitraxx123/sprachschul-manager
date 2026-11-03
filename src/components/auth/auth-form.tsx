"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Building2, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface AuthFormProps {
  logoUrl?: string | null;
  organizationName?: string | null;
}

export function AuthForm({ logoUrl, organizationName }: AuthFormProps = {}) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [signInState, signInAction, isSigningIn] = useActionState<AuthState | null, FormData>(
    signIn,
    null
  );

  const [signUpState, signUpAction, isSigningUp] = useActionState<AuthState | null, FormData>(
    signUp,
    null
  );

  const error = mode === "login" ? signInState?.error : signUpState?.error;
  const isPending = mode === "login" ? isSigningIn : isSigningUp;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Icon or Custom School Logo */}
      <div className="flex flex-col items-center mb-8">
        {logoUrl ? (
          <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 flex items-center justify-center shadow-sm mb-3 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={organizationName || "Logo"}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm mb-3">
            <GraduationCap strokeWidth={1.5} className="w-6 h-6" />
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {organizationName || t("title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("subtitle")}</p>
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="space-y-1 pb-4">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`py-2 text-sm font-medium rounded-md transition-all ${
                mode === "login"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {t("loginTab")}
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`py-2 text-sm font-medium rounded-md transition-all ${
                mode === "signup"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {t("signupTab")}
            </button>
          </div>
          <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
            {mode === "login" ? t("welcomeBack") : t("registerSchool")}
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            {mode === "login" ? t("loginDescription") : t("signupDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-sm text-red-700 dark:text-red-300">
              <AlertCircle strokeWidth={1.5} className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form action={mode === "login" ? signInAction : signUpAction} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="organizationName" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                  <Building2 strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                  <span>{t("schoolName")}</span>
                </Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  placeholder={t("schoolNamePlaceholder")}
                  required
                />
              </div>
            )}

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

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                <Lock strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                <span>{t("password")}</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                required
              />
              {mode === "login" && (
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t("forgotLink")}
                  </Link>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-2 animate-spin" />
                  {mode === "login" ? t("signingIn") : t("signingUp")}
                </>
              ) : mode === "login" ? (
                t("signInButton")
              ) : (
                t("signUpButton")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
        {t("footerNote")}
      </p>
    </div>
  );
}
