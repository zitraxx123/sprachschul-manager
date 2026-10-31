"use client";

import { useState } from "react";
import { deleteRoom } from "@/actions/rooms";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteRoomButtonProps {
  roomId: string;
  roomName: string;
}

export function DeleteRoomButton({ roomId, roomName }: DeleteRoomButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Möchten Sie den Raum "${roomName}" wirklich löschen?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteRoom(roomId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Raum "${roomName}" wurde gelöscht.`);
      }
    } catch {
      toast.error("Fehler beim Löschen des Raumes.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
      title="Raum löschen"
    >
      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </Button>
  );
}
