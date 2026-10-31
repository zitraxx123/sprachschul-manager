"use client";

import { ImportDataDialog } from "@/components/import/import-data-dialog";

interface ImportStudentsDialogProps {
  onSuccess?: () => void;
  buttonLabel?: string;
}

export function ImportStudentsDialog({
  onSuccess,
  buttonLabel = "Daten importieren",
}: ImportStudentsDialogProps) {
  return (
    <ImportDataDialog
      buttonLabel={buttonLabel}
      onSuccess={onSuccess}
    />
  );
}
