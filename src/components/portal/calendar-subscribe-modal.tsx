"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  X, 
  Copy, 
  Check, 
  CalendarSync, 
  Smartphone, 
  ExternalLink, 
  Info,
  Calendar as CalendarIcon
} from "lucide-react";
import { GoogleCalendarIcon } from "./google-calendar-icon";

interface CalendarSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  teacherName?: string;
}

export function CalendarSubscribeModal({
  isOpen,
  onClose,
  teacherId,
  teacherName,
}: CalendarSubscribeModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"google" | "apple" | "manual">("google");
  const [origin, setOrigin] = useState("");

  const tPortal = useTranslations("portal");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!isOpen) return null;

  const feedUrl = origin ? `${origin}/api/calendar/${teacherId}` : `/api/calendar/${teacherId}`;
  const webcalUrl = feedUrl.replace(/^https?:\/\//i, "webcal://");
  const googleSubscribeUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      toast.success(tCommon("copied"));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(tCommon("error"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1220]/55 dark:bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-2xl max-sm:rounded-b-none sm:max-w-xl sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-start justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold shrink-0">
              <CalendarSync strokeWidth={1.5} className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <span className="text-[11px] text-blue-400 font-bold uppercase tracking-wider block">
                {tPortal("calendarSyncTitle")}
              </span>
              <h3 className="text-lg font-bold text-white leading-snug">
                {tPortal("calendarModalTitle")}
              </h3>
              {teacherName && (
                <p className="text-xs text-slate-400">
                  {tPortal("instructor")} <strong className="text-slate-200">{teacherName}</strong>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg active:scale-95 transition-all touch-manipulation"
            aria-label={tCommon("close")}
          >
            <X strokeWidth={1.5} className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Main Instruction Card */}
          <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2">
            <div className="flex items-start space-x-2">
              <Info strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-blue-950 dark:text-blue-200">
                  {tPortal("mainInstruction")}
                </p>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-1">
                  {tPortal("subInstruction")}
                </p>
              </div>
            </div>
          </div>

          {/* Copyable Link Field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              {tPortal("personalLink")}
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={feedUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="font-mono text-xs pr-10 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 h-10 select-all"
                />
              </div>
              <Button
                type="button"
                onClick={handleCopy}
                className={`h-10 px-4 text-xs font-semibold shrink-0 transition-all ${
                  copied
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {copied ? (
                  <>
                    <Check strokeWidth={1.5} className="w-4 h-4 mr-1.5" />
                    <span>{tPortal("copied")}</span>
                  </>
                ) : (
                  <>
                    <Copy strokeWidth={1.5} className="w-4 h-4 mr-1.5" />
                    <span>{tPortal("copy")}</span>
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {tPortal("formatDesc")}
            </p>
          </div>

          {/* One-Click Direct Launch Options */}
          <div className="pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              {tPortal("directActions")}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={googleSubscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm transition-all group"
              >
                <GoogleCalendarIcon className="w-4 h-4 shrink-0" />
                <span>{tPortal("openInGoogle")}</span>
                <ExternalLink strokeWidth={1.5} className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
              </a>

              <a
                href={webcalUrl}
                className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm transition-all group"
              >
                <Smartphone strokeWidth={1.5} className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
                <span>{tPortal("openInApple")}</span>
                <ExternalLink strokeWidth={1.5} className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
              </a>
            </div>
          </div>

          {/* Step-by-Step Instructions Tabs */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              {tPortal("stepByStep")}
            </span>

            {/* Instruction Tabs */}
            <div className="flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => setActiveTab("google")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-2 ${
                  activeTab === "google"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <GoogleCalendarIcon className="w-3.5 h-3.5" />
                <span>Google Calendar</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("apple")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-2 ${
                  activeTab === "apple"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Smartphone strokeWidth={1.5} className="w-4 h-4" />
                <span>Apple / iPhone</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-2 ${
                  activeTab === "manual"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{tPortal("outlookOther")}</span>
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === "google" && (
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <li>
                  <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-semibold underline">calendar.google.com</a>
                </li>
                <li>{tPortal("subGoogleStep2")}</li>
                <li>{tPortal("subGoogleStep3")}</li>
                <li>{tPortal("subGoogleStep4")}</li>
              </ol>
            )}

            {activeTab === "apple" && (
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <li>{tPortal("subAppleStep1")}</li>
                <li>{tPortal("subAppleStep2")}</li>
                <li>{tPortal("subAppleStep3")}</li>
              </ol>
            )}

            {activeTab === "manual" && (
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <p>
                  In Outlook, Thunderbird or any iCalendar app:
                  Choose &quot;Subscribe to Calendar&quot; and paste the URL.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
