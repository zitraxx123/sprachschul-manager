import { getTranslations } from "next-intl/server";
import { FileSpreadsheet, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/** Plain GET form: the browser downloads the CSV from /api/export/accounting. */
export async function AccountingExport({ month }: { month: string }) {
  const t = await getTranslations("accountingExport");
  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start space-x-3">
          <FileSpreadsheet strokeWidth={1.5} className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("title")}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("hint")}</p>
          </div>
        </div>
        <form method="GET" action="/api/export/accounting" className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="acc-from" className="text-xs">{t("from")}</Label>
            <Input id="acc-from" type="month" name="from" defaultValue={month} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="acc-to" className="text-xs">{t("to")}</Label>
            <Input id="acc-to" type="month" name="to" defaultValue={month} required />
          </div>
          <Button type="submit" name="type" value="invoices" variant="outline" className="space-x-1">
            <Download strokeWidth={1.5} className="w-4 h-4" />
            <span>{t("invoices")}</span>
          </Button>
          <Button type="submit" name="type" value="payouts" variant="outline" className="space-x-1">
            <Download strokeWidth={1.5} className="w-4 h-4" />
            <span>{t("payouts")}</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
