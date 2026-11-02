"use client";

import { useTranslations } from "next-intl";
import { ImportDataDialog } from "@/components/import/import-data-dialog";

interface ImportStudentsDialogProps {
  onSuccess?: () => void;
  buttonLabel?: string;
}

export function ImportStudentsDialog({
  onSuccess,
  buttonLabel,
}: ImportStudentsDialogProps) {
  const tImport = useTranslations("import");
  return (
    <ImportDataDialog
      buttonLabel={buttonLabel || tImport("buttonLabel")}
      onSuccess={onSuccess}
    />
  );
}
