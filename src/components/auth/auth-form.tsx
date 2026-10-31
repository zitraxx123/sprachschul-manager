"use client";

import { useState } from "react";
import { useActionState } from "react";
import { signIn, signUp, AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Building2, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";

export function AuthForm() {
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
      {/* Brand Icon */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md mb-3">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sprachschul-Manager</h1>
        <p className="text-sm text-slate-500 mt-1">Multi-Tenant Schulverwaltung & Honorarabrechnung</p>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardHeader className="space-y-1 pb-4">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg mb-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`py-2 text-sm font-medium rounded-md transition-all ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`py-2 text-sm font-medium rounded-md transition-all ${
                mode === "signup"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Registrieren
            </button>
          </div>
          <CardTitle className="text-xl">
            {mode === "login" ? "Willkommen zurück" : "Neue Sprachschule registrieren"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Melden Sie sich mit Ihren Zugangsdaten an."
              : "Erstellen Sie ein Konto und richten Sie Ihre Schule als Mandant ein."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form action={mode === "login" ? signInAction : signUpAction} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="organizationName" className="flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Name Ihrer Sprachschule</span>
                </Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  placeholder="z. B. Sprachschule Berlin Mitte"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>E-Mail-Adresse</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@ihre-schule.de"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Passwort</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === "login" ? "Anmelden..." : "Konto erstellen..."}
                </>
              ) : mode === "login" ? (
                "Anmelden"
              ) : (
                "Schule & Konto registrieren"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-slate-400 mt-6">
        Multi-Tenant SaaS • Supabase Row Level Security • DSGVO konform
      </p>
    </div>
  );
}
