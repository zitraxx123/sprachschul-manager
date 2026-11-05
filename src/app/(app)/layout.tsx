import { redirect } from "next/navigation";
import { 
  getCurrentUser, 
  getActiveOrganization, 
  getCurrentMembership, 
  getCurrentTeacher 
} from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";

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
  const isAssistant = membership?.role === "assistant";

  // If user is logged in but has no organization yet, fallback to a default name
  const orgName = organization?.name || "Meine Sprachschule";

  return (
    <div className="relative flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-blue-600/[0.07] via-[#00C2FF]/[0.03] to-transparent dark:from-blue-500/10 print:hidden" />
      <Sidebar 
        organizationName={orgName} 
        logoUrl={organization?.logo_url || null}
        userEmail={user.email || ""} 
        userName={teacher?.name || user.email || ""}
        isTeacher={isTeacher}
        isAssistant={isAssistant}
      />
      <div className="flex-1 flex flex-col min-w-0 print:w-full print:block">
        <Header 
          organizationName={orgName} 
          logoUrl={organization?.logo_url || null}
          userEmail={user.email || ""} 
          userName={teacher?.name || user.email || ""} 
          isTeacher={isTeacher}
          isAssistant={isAssistant}
        />
        <main className="flex-1 px-3 sm:px-8 py-4 sm:py-8 pb-24 md:pb-8 overflow-y-auto print:p-0 print:overflow-visible print:bg-white">
          {children}
        </main>
        <BottomNav isTeacher={isTeacher} isAssistant={isAssistant} />
      </div>
    </div>
  );
}
