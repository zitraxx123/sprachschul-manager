"use client";

import { useTransition } from "react";
import { deleteStudent } from "@/actions/students";
import { Course, Student, CourseSchedule, MonthlyPayment } from "@/types/database";
import { RecordPaymentDialog } from "@/components/students/record-payment-dialog";
import { EditStudentDialog } from "@/components/students/edit-student-dialog";
import { StudentProfileDialog } from "@/components/students/student-profile-dialog";
import { CourseInfoData } from "@/components/courses/course-info-dialog";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Eye } from "lucide-react";

interface StudentActionsProps {
  student: Student;
  courses?: Array<Course & { course_schedules?: CourseSchedule[] }>;
  assignedCourseIds?: string[];
  enrolledCourseDetails?: CourseInfoData[];
  payment?: MonthlyPayment | null;
  currentMonthYear?: string;
  isAlreadyPaid?: boolean;
}

export function StudentActions({
  student,
  courses = [],
  assignedCourseIds = [],
  enrolledCourseDetails = [],
  payment,
  currentMonthYear,
  isAlreadyPaid = false,
}: StudentActionsProps) {
  const [isPending, startTransition] = useTransition();
  const studentName = `${student.first_name} ${student.last_name}`;

  function handleDelete() {
    if (confirm(`Möchten Sie den Schüler "${studentName}" wirklich löschen?`)) {
      startTransition(async () => {
        try {
          await deleteStudent(student.id);
          toast.success(`Schüler "${studentName}" wurde gelöscht.`);
        } catch {
          toast.error("Fehler beim Löschen des Schülers.");
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
          title="Schülerprofil / Akte ansehen"
        >
          <Eye className="w-3.5 h-3.5" />
        </Button>
      </StudentProfileDialog>

      <RecordPaymentDialog
        studentId={student.id}
        studentName={studentName}
        currentMonthYear={currentMonthYear}
        isAlreadyPaid={isAlreadyPaid}
      />

      <EditStudentDialog
        student={student}
        courses={courses}
        assignedCourseIds={assignedCourseIds}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={isPending}
        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
        title="Schüler löschen"
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
      </Button>
    </div>
  );
}
