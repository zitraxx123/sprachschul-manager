"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const tRooms = useTranslations("rooms");
  const tCommon = useTranslations("common");

  async function handleDelete() {
    if (!confirm(tRooms("deleteConfirm", { name: roomName }))) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteRoom(roomId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(tRooms("deletedSuccess", { name: roomName }));
      }
    } catch {
      toast.error(tRooms("deleteError"));
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
      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
      title={tCommon("delete")}
    >
      {isDeleting ? <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" /> : <Trash2 strokeWidth={1.5} className="w-4 h-4" />}
    </Button>
  );
}
