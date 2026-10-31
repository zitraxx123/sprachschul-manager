import { redirect } from "next/navigation";
import { 
  getCurrentUser, 
  getActiveOrganization, 
  getCurrentMembership, 
  getCurrentTeacher 
} from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const organization = await getActiveOrganization();
  const membership = await getCurrentMembership();
  const teacher = await getCurrentTeacher();

  // If user is linked to teacher profile and has role 'teacher', treat as teacher
  const isTeacher = !!teacher && membership?.role === "teacher";

  // If user is logged in but has no organization yet, fallback to a default name
  const orgName = organization?.name || "Meine Sprachschule";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        organizationName={orgName} 
        userEmail={user.email || ""} 
        userName={teacher?.name || user.email || ""}
        isTeacher={isTeacher}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header organizationName={orgName} />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
