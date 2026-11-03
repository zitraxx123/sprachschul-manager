export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          late_cancellation_hours: number;
          late_cancellation_pay_percent: number;
          address_street: string | null;
          address_zip: string | null;
          address_city: string | null;
          tax_number: string | null;
          vat_id: string | null;
          iban: string | null;
          bic: string | null;
          bank_name: string | null;
          invoice_payment_days: number;
          invoice_vat_rate: number;
          invoice_tax_note: string | null;
          minijob_monthly_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          late_cancellation_hours?: number;
          late_cancellation_pay_percent?: number;
          address_street?: string | null;
          address_zip?: string | null;
          address_city?: string | null;
          tax_number?: string | null;
          vat_id?: string | null;
          iban?: string | null;
          bic?: string | null;
          bank_name?: string | null;
          invoice_payment_days?: number;
          invoice_vat_rate?: number;
          invoice_tax_note?: string | null;
          minijob_monthly_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          late_cancellation_hours?: number;
          late_cancellation_pay_percent?: number;
          address_street?: string | null;
          address_zip?: string | null;
          address_city?: string | null;
          tax_number?: string | null;
          vat_id?: string | null;
          iban?: string | null;
          bic?: string | null;
          bank_name?: string | null;
          invoice_payment_days?: number;
          invoice_vat_rate?: number;
          invoice_tax_note?: string | null;
          minijob_monthly_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: "owner" | "admin" | "teacher";
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: "owner" | "admin" | "teacher";
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "teacher";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      teachers: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          birthday: string | null;
          hourly_rate: number;
          rate_group: number | null;
          rate_individual: number | null;
          rate_45: number | null;
          rate_60: number | null;
          rate_90: number | null;
          employment_type: "honorar" | "minijob" | "teilzeit";
          tax_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          name: string;
          email?: string | null;
          phone?: string | null;
          birthday?: string | null;
          hourly_rate?: number;
          rate_group?: number | null;
          rate_individual?: number | null;
          rate_45?: number | null;
          rate_60?: number | null;
          rate_90?: number | null;
          employment_type?: "honorar" | "minijob" | "teilzeit";
          tax_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          name?: string;
          email?: string | null;
          phone?: string | null;
          birthday?: string | null;
          hourly_rate?: number;
          rate_group?: number | null;
          rate_individual?: number | null;
          rate_45?: number | null;
          rate_60?: number | null;
          rate_90?: number | null;
          employment_type?: "honorar" | "minijob" | "teilzeit";
          tax_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teachers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      students: {
        Row: {
          id: string;
          organization_id: string;
          course_id: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          parent_name: string | null;
          parent_phone: string | null;
          parent_email: string | null;
          course_name: string | null;
          custom_monthly_price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          course_id?: string | null;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          parent_name?: string | null;
          parent_phone?: string | null;
          parent_email?: string | null;
          course_name?: string | null;
          custom_monthly_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          course_id?: string | null;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          parent_name?: string | null;
          parent_phone?: string | null;
          parent_email?: string | null;
          course_name?: string | null;
          custom_monthly_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "students_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      courses: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          teacher_id: string | null;
          room_id: string | null;
          course_type: "group" | "individual";
          description: string | null;
          max_capacity: number;
          monthly_price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          teacher_id?: string | null;
          room_id?: string | null;
          course_type?: "group" | "individual";
          description?: string | null;
          max_capacity?: number;
          monthly_price?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          teacher_id?: string | null;
          room_id?: string | null;
          course_type?: "group" | "individual";
          description?: string | null;
          max_capacity?: number;
          monthly_price?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      rooms: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      course_schedules: {
        Row: {
          id: string;
          course_id: string;
          organization_id: string | null;
          day_of_week: string;
          start_time: string;
          duration: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          organization_id?: string | null;
          day_of_week: string;
          start_time?: string;
          duration?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          organization_id?: string | null;
          day_of_week?: string;
          start_time?: string;
          duration?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_schedules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_schedules_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      invoices: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string | null;
          student_name: string;
          recipient_name: string;
          month_year: string;
          invoice_year: number;
          invoice_seq: number;
          invoice_number: string;
          issue_date: string;
          due_date: string;
          items: InvoiceItem[];
          net_amount: number;
          vat_rate: number;
          vat_amount: number;
          total_amount: number;
          status: "open" | "paid" | "cancelled";
          paid_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id?: string | null;
          student_name: string;
          recipient_name: string;
          month_year: string;
          invoice_year: number;
          invoice_seq: number;
          invoice_number: string;
          issue_date: string;
          due_date: string;
          items?: InvoiceItem[];
          net_amount: number;
          vat_rate?: number;
          vat_amount?: number;
          total_amount: number;
          status?: "open" | "paid" | "cancelled";
          paid_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "open" | "paid" | "cancelled";
          paid_at?: string | null;
          cancelled_at?: string | null;
        };
        Relationships: [];
      };
      lesson_overrides: {
        Row: {
          id: string;
          organization_id: string;
          course_id: string;
          lesson_date: string;
          original_start_time: string;
          new_date: string | null;
          new_start_time: string | null;
          new_duration: number | null;
          new_teacher_id: string | null;
          original_teacher_id: string | null;
          reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          course_id: string;
          lesson_date: string;
          original_start_time: string;
          new_date?: string | null;
          new_start_time?: string | null;
          new_duration?: number | null;
          new_teacher_id?: string | null;
          original_teacher_id?: string | null;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          course_id?: string;
          lesson_date?: string;
          original_start_time?: string;
          new_date?: string | null;
          new_start_time?: string | null;
          new_duration?: number | null;
          new_teacher_id?: string | null;
          original_teacher_id?: string | null;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_overrides_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_overrides_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_payments: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          month_year: string;
          amount_euro: number;
          is_paid: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          month_year: string;
          amount_euro?: number;
          is_paid?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          student_id?: string;
          month_year?: string;
          amount_euro?: number;
          is_paid?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_payments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monthly_payments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      attendance: {
        Row: {
          id: string;
          organization_id: string;
          lesson_id: string;
          student_id: string;
          status: "present" | "absent";
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lesson_id: string;
          student_id: string;
          status: "present" | "absent";
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          lesson_id?: string;
          student_id?: string;
          status?: "present" | "absent";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      student_courses: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          course_id: string;
          status: "active" | "trial" | "waiting";
          contract_start: string | null;
          contract_end: string | null;
          notice_period_weeks: number;
          cancelled_on: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          course_id: string;
          status?: "active" | "trial" | "waiting";
          contract_start?: string | null;
          contract_end?: string | null;
          notice_period_weeks?: number;
          cancelled_on?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          student_id?: string;
          course_id?: string;
          status?: "active" | "trial" | "waiting";
          contract_start?: string | null;
          contract_end?: string | null;
          notice_period_weeks?: number;
          cancelled_on?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_courses_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_courses_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_courses_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      lessons: {
        Row: {
          id: string;
          organization_id: string;
          teacher_id: string;
          original_teacher_id: string | null;
          student_id: string | null;
          course_id: string | null;
          student_name: string | null;
          lesson_date: string;
          duration_hours: number;
          notes: string | null;
          status: "completed" | "cancelled_by_student" | "cancelled_late";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          teacher_id: string;
          original_teacher_id?: string | null;
          student_id?: string | null;
          course_id?: string | null;
          student_name?: string | null;
          lesson_date?: string;
          duration_hours: number;
          notes?: string | null;
          status?: "completed" | "cancelled_by_student" | "cancelled_late";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          teacher_id?: string;
          original_teacher_id?: string | null;
          student_id?: string | null;
          course_id?: string | null;
          student_name?: string | null;
          lesson_date?: string;
          duration_hours?: number;
          notes?: string | null;
          status?: "completed" | "cancelled_by_student" | "cancelled_late";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_original_teacher_id_fkey";
            columns: ["original_teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_org_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      is_org_admin: {
        Args: {
          org_id: string;
        };
        Returns: boolean;
      };
      get_current_teacher_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      create_invoice: {
        Args: {
          p_org: string;
          p_student: string;
          p_student_name: string;
          p_recipient_name: string;
          p_month_year: string;
          p_issue_date: string;
          p_due_date: string;
          p_items: InvoiceItem[];
          p_net: number;
          p_vat_rate: number;
          p_vat_amount: number;
          p_total: number;
          p_status: "open" | "paid";
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"];
export type Teacher = Database["public"]["Tables"]["teachers"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Room = Database["public"]["Tables"]["rooms"]["Row"];
export type CourseSchedule = Database["public"]["Tables"]["course_schedules"]["Row"];
export type MonthlyPayment = Database["public"]["Tables"]["monthly_payments"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type StudentCourse = Database["public"]["Tables"]["student_courses"]["Row"];
export type StudentCourseStatus = Database["public"]["Tables"]["student_courses"]["Row"]["status"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type LessonOverrideRow = Database["public"]["Tables"]["lesson_overrides"]["Row"];
export type LessonStatus = Database["public"]["Tables"]["lessons"]["Row"]["status"];

export type LessonWithTeacher = Lesson & {
  teacher?: Teacher;
  student?: Student;
  course?: Course;
};
