"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateRoom, RoomActionState } from "@/actions/rooms";
import { Room } from "@/types/database";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2, AlertCircle, X, DoorOpen } from "lucide-react";

interface EditRoomDialogProps {
  room: Room;
}

export function EditRoomDialog({ room }: EditRoomDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(room.name);

  const [state, formAction, isPending] = useActionState<RoomActionState | null, FormData>(
    async (prev, formData) => {
      const res = await updateRoom(prev, formData);
      if (res?.success) {
        toast.success("Raum aktualisiert!");
        setIsOpen(false);
      } else if (res?.error) {
        toast.error(res.error);
      }
      return res;
    },
    null
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setName(room.name);
          setIsOpen(true);
        }}
        className="h-8 w-8 text-slate-500 hover:text-slate-800"
        title="Raum bearbeiten"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-sm:rounded-t-3xl sm:max-w-md sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Raum bearbeiten</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Bezeichnung anpassen</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Form */}
            <form action={formAction} className="p-5 space-y-4">
              <input type="hidden" name="id" value={room.id} />

              {state?.error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{state.error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor={`name-${room.id}`} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bezeichnung des Raumes *
                </Label>
                <Input
                  id={`name-${room.id}`}
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. Raum 1 oder Online"
                  required
                  disabled={isPending}
                  autoFocus
                  className="h-10"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isPending} className="space-x-1.5">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Speichern</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
