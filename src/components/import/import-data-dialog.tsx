"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  parseImportFile,
  downloadImportTemplateXlsx,
  ParsedImportData,
} from "@/lib/excel-import";
import {
  importSchoolData,
  ImportActionResult,
  ImportLogMessage,
} from "@/actions/import";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  Users,
  BookOpen,
  School,
  FileText,
  RotateCcw,
  Sparkles,
  Check,
} from "lucide-react";

interface ImportDataDialogProps {
  buttonLabel?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  onSuccess?: () => void;
}

export function ImportDataDialog({
  buttonLabel = "Daten importieren",
  variant = "outline",
  size = "sm",
  className = "",
  onSuccess,
}: ImportDataDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [parsedData, setParsedData] = useState<ParsedImportData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportActionResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setParsedData(null);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      if (importResult?.success) {
        router.refresh();
        onSuccess?.();
      }
      resetState();
    }
  }

  async function processFile(file: File) {
    setParseError(null);
    setImportResult(null);
    setIsParsing(true);

    try {
      const data = await parseImportFile(file);

      if (
        data.teachers.length === 0 &&
        data.courses.length === 0 &&
        data.students.length === 0
      ) {
        setParseError(
          "Keine importierbaren Daten in der Datei gefunden. Bitte prüfen Sie das Format oder nutzen Sie die Excel-Vorlage."
        );
        setParsedData(null);
      } else {
        setParsedData(data);
      }
    } catch (err: unknown) {
      setParseError(
        `Fehler beim Lesen der Excel/CSV-Datei: ${err instanceof Error ? err.message : String(err)}`
      );
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function handleStartImport() {
    if (!parsedData) return;

    startTransition(async () => {
      try {
        const result = await importSchoolData({
          teachers: parsedData.teachers,
          courses: parsedData.courses,
          students: parsedData.students,
        });

        setImportResult(result);

        if (result.success) {
          toast.success("Daten erfolgreich importiert!");
          router.refresh();
          onSuccess?.();
        } else {
          toast.error(result.error || "Fehler beim Durchführen des Imports.");
        }
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Unerwarteter Fehler beim Importieren."
        );
      }
    });
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={`flex items-center space-x-1.5 font-medium shadow-2xs ${className}`}
      >
        <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>{buttonLabel}</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-3xl sm:max-w-3xl sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Intelligenter Daten-Import</span>
                    <span className="text-[11px] font-medium bg-white/20 px-2 py-0.5 rounded-full">
                      .xlsx / .csv
                    </span>
                  </h3>
                  <p className="text-xs text-blue-100">
                    Laden Sie Ihre Excel-Datei mit den drei Reitern hoch: Lehrer, Kurse und Schüler.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 max-h-[calc(90dvh-120px)] sm:max-h-[75vh]">
              {/* 1. Google Forms Info Box */}
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50/50 to-sky-50 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-slate-900 border border-blue-200/80 dark:border-blue-800/60 rounded-xl p-4 sm:p-4.5 shadow-2xs">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Tipp: Daten aus Google Forms &amp; Online-Anmeldungen
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={downloadImportTemplateXlsx}
                        className="h-8 text-xs bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/80 shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                        Vorlage (.xlsx) herunterladen
                      </Button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Sammeln Sie Anmeldungen über Google Forms? Öffnen Sie die verknüpfte Google-Tabelle, klicken Sie auf{" "}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Datei → Herunterladen → Microsoft Excel (.xlsx)
                      </span>{" "}
                      und kopieren Sie die Spalten in unsere 3 Vorlage-Reiter (
                      <code className="px-1 py-0.5 rounded bg-blue-100/70 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-mono text-[11px]">
                        Lehrer
                      </code>
                      ,{" "}
                      <code className="px-1 py-0.5 rounded bg-blue-100/70 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-mono text-[11px]">
                        Kurse
                      </code>
                      ,{" "}
                      <code className="px-1 py-0.5 rounded bg-blue-100/70 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-mono text-[11px]">
                        Schueler
                      </code>
                      ).
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Drag & Drop Zone */}
              <div>
                <label
                  htmlFor="excel-universal-upload"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-7 sm:p-9 cursor-pointer transition-all duration-200 text-center ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-4 ring-blue-500/20 scale-[1.01]"
                      : "border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-blue-50/20 dark:hover:bg-blue-950/20"
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3.5 ring-8 ring-blue-50 dark:ring-blue-950/40 transition-transform duration-200 group-hover:scale-105">
                    {isParsing ? (
                      <Loader2 className="w-7 h-7 animate-spin text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Upload className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>

                  <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                    {isParsing
                      ? "Datei wird analysiert und validiert..."
                      : "Excel-Datei (.xlsx) hierher ziehen oder durchsuchen"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                    Unterstützt eine Arbeitsmappe mit den Reitern{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Lehrer, Kurse &amp; Schueler
                    </span>{" "}
                    oder eine Standard-CSV-Datei.
                  </p>

                  <input
                    id="excel-universal-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {parseError && (
                  <div className="mt-3 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start space-x-2.5 text-red-700 dark:text-red-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{parseError}</span>
                  </div>
                )}
              </div>

              {/* 3. File Preview & Action Trigger */}
              {parsedData && !importResult && (
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in-50 duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {parsedData.fileName}
                          </span>
                          <Badge variant="success" className="text-[10px] py-0 px-2">
                            Bereit
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {parsedData.mode === "multi_sheet"
                            ? "Mehrteilige Excel-Arbeitsmappe erkannt"
                            : "Standard-Tabelle / CSV erkannt"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetState}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Zurücksetzen
                      </Button>
                      <Button
                        type="button"
                        onClick={handleStartImport}
                        disabled={isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            Import läuft...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-1.5" />
                            Import jetzt starten
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Detected Sheets Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Blatt 1: Lehrer</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {parsedData.teachers.length} Datensätze
                        </p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Blatt 2: Kurse</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {parsedData.courses.length} Datensätze
                        </p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Blatt 3: Schüler</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {parsedData.students.length} Datensätze
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Beautiful Results Log */}
              {importResult && (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  {/* Results Summary Strip */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white rounded-xl p-4 sm:p-5 border border-slate-800 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 pb-3 border-b border-slate-800">
                      <div className="flex items-center space-x-2">
                        {importResult.success ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        )}
                        <span className="text-sm font-bold">
                          {importResult.success
                            ? "Import erfolgreich verarbeitet"
                            : "Import mit Fehlern beendet"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Status:{" "}
                        <span className="text-slate-200 font-semibold">
                          {importResult.stats.errorsCount === 0
                            ? "Ohne Fehler"
                            : `${importResult.stats.errorsCount} Fehler aufgetreten`}
                        </span>
                      </div>
                    </div>

                    {/* Stats Badges Required in prompt: "Учителей создано: 5. Курсов: 3. Учеников: 20. Ошибок: 0" */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5 text-center text-xs">
                      <div className="bg-white/10 rounded-lg p-2.5">
                        <p className="text-[11px] text-slate-300">Lehrer erstellt</p>
                        <p className="text-lg font-bold text-white mt-0.5">
                          {importResult.stats.teachersCreated}
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-lg p-2.5">
                        <p className="text-[11px] text-slate-300">Kurse erstellt</p>
                        <p className="text-lg font-bold text-white mt-0.5">
                          {importResult.stats.coursesCreated}
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-lg p-2.5">
                        <p className="text-[11px] text-slate-300">Räume erstellt</p>
                        <p className="text-lg font-bold text-white mt-0.5">
                          {importResult.stats.roomsCreated}
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-lg p-2.5">
                        <p className="text-[11px] text-slate-300">Schüler erstellt</p>
                        <p className="text-lg font-bold text-white mt-0.5">
                          {importResult.stats.studentsCreated}
                        </p>
                      </div>

                      <div className={`rounded-lg p-2.5 ${
                        importResult.stats.errorsCount > 0 ? "bg-red-900/50 text-red-200" : "bg-white/10"
                      }`}>
                        <p className="text-[11px] text-slate-300">Fehler</p>
                        <p className="text-lg font-bold text-white mt-0.5">
                          {importResult.stats.errorsCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Execution Log Stream */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">
                        Verlaufsprotokoll (Log)
                      </span>
                      <span>{importResult.logs.length} Einträge</span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 max-h-56 overflow-y-auto font-mono text-xs space-y-1.5 text-slate-300 shadow-inner">
                      {importResult.logs.map((log, idx) => (
                        <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                          <span className="text-slate-500 text-[10px] select-none pt-0.5">
                            {log.time}
                          </span>
                          {log.type === "success" && (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          {log.type === "info" && (
                            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                          )}
                          {log.type === "warning" && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          )}
                          {log.type === "error" && (
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          )}
                          <span
                            className={
                              log.type === "error"
                                ? "text-red-300"
                                : log.type === "warning"
                                ? "text-amber-300"
                                : log.type === "success"
                                ? "text-emerald-200"
                                : "text-slate-300"
                            }
                          >
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions after import */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetState}
                      className="text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Weitere Datei importieren
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenChange(false)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                      Fertigstellen &amp; Schließen
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
              <span>
                Unterstützte Dateitypen: <code className="font-mono text-slate-700 dark:text-slate-300">.xlsx</code>, <code className="font-mono text-slate-700 dark:text-slate-300">.xls</code>, <code className="font-mono text-slate-700 dark:text-slate-300">.csv</code>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenChange(false)}
                className="text-xs"
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
