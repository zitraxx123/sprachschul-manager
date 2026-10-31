import Link from "next/link";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { AddTeacherDialog } from "@/components/teachers/add-teacher-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { Users, Mail, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Lehrkräfte • Sprachschul-Manager",
};

export default async function TeachersPage() {
  const organization = await getActiveOrganization();
  const supabase = await createClient();

  if (!organization) {
    return <CreateOrganizationCard />;
  }

  // 1. Fetch teachers
  const { data: teachers = [] } = await supabase
    .from("teachers")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name", { ascending: true });

  // 2. Fetch current month lessons to calculate current month payroll
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: lessons = [] } = await supabase
    .from("lessons")
    .select("teacher_id, duration_hours, lesson_date")
    .eq("organization_id", organization.id)
    .gte("lesson_date", `${currentYearMonth}-01`);

  // Map monthly hours per teacher
  const monthlyHoursMap = new Map<string, number>();
  (lessons || []).forEach((l) => {
    const current = monthlyHoursMap.get(l.teacher_id) || 0;
    monthlyHoursMap.set(l.teacher_id, current + Number(l.duration_hours || 0));
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lehrkräfte (Dozenten)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Verwalten Sie Ihre Dozenten, vertragliche Stundensätze und Honorarabrechnungen.
          </p>
        </div>

        <AddTeacherDialog />
      </div>

      {/* Teachers Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Erfasste Dozenten ({teachers?.length || 0})</CardTitle>
          <CardDescription>
            Klicken Sie auf &quot;Details &amp; Honorar&quot;, um die genaue Monatsabrechnung mit allen Unterrichtsstunden einzusehen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!teachers || teachers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <Users className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Noch keine Dozenten vorhanden</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Nutzen Sie die Schaltfläche &quot;Lehrkraft hinzufügen&quot;, um den ersten Lehrer anzulegen.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dozent</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Stundensatz</TableHead>
                  <TableHead>Stunden (Lfd. Monat)</TableHead>
                  <TableHead className="text-right">Auszahlung (Lfd. Monat)</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => {
                  const monthHours = monthlyHoursMap.get(teacher.id) || 0;
                  const monthEarnings = monthHours * Number(teacher.hourly_rate);

                  return (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-semibold text-slate-900">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                            {teacher.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{teacher.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {teacher.email ? (
                          <div className="flex items-center space-x-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{teacher.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {formatCurrency(Number(teacher.hourly_rate))} / Std.
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-700 font-medium">
                        {monthHours.toFixed(1)} Std.
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {formatCurrency(monthEarnings)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/teachers/${teacher.id}`}>
                          <Button variant="outline" size="sm" className="space-x-1 text-xs">
                            <span>Details &amp; Honorar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
