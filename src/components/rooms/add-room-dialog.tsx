"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createRoom, RoomActionState } from "@/actions/rooms";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DoorOpen, Plus, Loader2, AlertCircle, X, Sparkles } from "lucide-react";

const QUICK_PRESETS = [
  "Raum 1",
  "Raum 2",
  "Raum 3",
  "Raum 4",
  "Online (Zoom)",
  "Online (Meet)",
  "Großer Saal",
];

export function AddRoomDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const tRooms = useTranslations("rooms");
  const tCommon = useTranslations("common");

  const [state, formAction, isPending] = useActionState<RoomActionState | null, FormData>(
    async (prev, formData) => {
      const res = await createRoom(prev, formData);
      if (res?.success) {
        toast.success(tRooms("savedSuccess"));
        setIsOpen(false);
        setName("");
      } else if (res?.error) {
        toast.error(res.error);
      }
      return res;
    },
    null
  );

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="space-x-2 shadow-sm">
        <Plus strokeWidth={1.5} className="w-4 h-4" />
        <span>{tRooms("addRoom")}</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-sm:rounded-t-xl sm:max-w-md sm:rounded-xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <DoorOpen strokeWidth={1.5} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{tRooms("newRoomTitle")}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{tRooms("newRoomDesc")}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X strokeWidth={1.5} className="w-4 h-4" />
              </Button>
            </div>

            {/* Content / Form */}
            <form action={formAction} className="p-5 space-y-4">
              {state?.error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{state.error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {tRooms("roomNameLabel")}
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tRooms("roomNamePlaceholder")}
                  required
                  disabled={isPending}
                  autoFocus
                  className="h-10"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <Sparkles strokeWidth={1.5} className="w-4 h-4 text-amber-600" />
                  <span>{tRooms("quickPresets")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setName(preset)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={isPending} className="space-x-2">
                  {isPending && <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" />}
                  <span>{tRooms("saveRoom")}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
