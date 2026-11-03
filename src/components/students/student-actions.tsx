"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteStudent } from "@/actions/students";
import { Course, Student, CourseSchedule, MonthlyPayment, SepaMandateRow } from "@/types/database";
import { SepaMandateDialog } from "@/components/students/sepa-mandate-dialog";
import { RecordPaymentDialog } from "@/components/students/record-payment-dialog";
import { EditStudentDialog } from "@/components/students/edit-student-dialog";
import { StudentPrivacyDialog } from "@/components/students/student-privacy-dialog";
import { StudentProfileDialog } from "@/components/students/student-profile-dialog";
import { ContractDialog, ContractEnrollment } from "@/components/students/contract-dialog";
import { CourseInfoData } from "@/components/courses/course-info-dialog";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trash2, Loader2, Eye, Award } from "lucide-react";

interface StudentActionsProps {
  student: Student;
  courses?: Array<Course & { course_schedules?: CourseSchedule[] }>;
  assignedCourseIds?: string[];
  enrolledCourseDetails?: CourseInfoData[];
  contractEnrollments?: ContractEnrollment[];
  sepaMandate?: SepaMandateRow | null;
  payment?: MonthlyPayment | null;
  currentMonthYear?: string;
  isAlreadyPaid?: boolean;
}

export function StudentActions({
  student,
  courses = [],
  assignedCourseIds = [],
  enrolledCourseDetails = [],
  contractEnrollments = [],
  sepaMandate = null,
  payment,
  currentMonthYear,
  isAlreadyPaid = false,
}: StudentActionsProps) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const studentName = `${student.first_name} ${student.last_name}`;

  // Automatically calculate expected monthly tuition fee:
  // 1. If student has custom_monthly_price, use that
  // 2. Otherwise sum the monthly_price of all enrolled courses
  const calculatedPaymentAmount = (() => {
    if (student.custom_monthly_price !== null && student.custom_monthly_price !== undefined) {
      return Number(student.custom_monthly_price);
    }
    if (assignedCourseIds.length > 0 && courses.length > 0) {
      const priceMap = new Map(courses.map((c) => [c.id, Number(c.monthly_price || 0)]));
      const total = assignedCourseIds.reduce((sum, cId) => sum + (priceMap.get(cId) || 0), 0);
      if (total > 0) return total;
    }
    if (payment?.amount_euro) {
      return Number(payment.amount_euro);
    }
    return 0;
  })();

  function handleDelete() {
    if (confirm(t("deleteConfirm"))) {
      startTransition(async () => {
        try {
          await deleteStudent(student.id);
          toast.success(t("deletedSuccess"));
        } catch {
          toast.error(t("deleteError"));
        }
      });
    }
  }

  return (
    <div className="flex items-center space-x-1 justify-end">
      {/* View full profile dialog */}
      <StudentProfileDialog
        student={student}
        courses={enrolledCourseDetails}
        payment={payment}
        currentMonthYear={currentMonthYear}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
          title={t("viewRecord")}
        >
          <Eye strokeWidth={1.5} className="w-4 h-4" />
        </Button>
      </StudentProfileDialog>

      <ContractDialog studentId={student.id} studentName={studentName} enrollments={contractEnrollments} />

      <SepaMandateDialog studentId={student.id} studentName={studentName} mandate={sepaMandate} />

      <RecordPaymentDialog
        studentId={student.id}
        studentName={studentName}
        currentMonthYear={currentMonthYear}
        defaultAmount={calculatedPaymentAmount}
        isAlreadyPaid={isAlreadyPaid}
      />

      <EditStudentDialog
        student={student}
        courses={courses}
        assignedCourseIds={assignedCourseIds}
      />

      <Link
        href={`/students/${student.id}/certificate`}
        title={t("certificateButton")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
      >
        <Award strokeWidth={1.5} className="w-4 h-4" />
      </Link>

      <StudentPrivacyDialog studentId={student.id} studentName={studentName} />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={isPending}
        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
        title={tCommon("delete")}
      >
        {isPending ? (
          <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin text-slate-400" />
        ) : (
          <Trash2 strokeWidth={1.5} className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
