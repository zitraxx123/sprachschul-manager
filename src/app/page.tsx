import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentTeacher, getCurrentMembership } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    const teacher = await getCurrentTeacher();
    const membership = await getCurrentMembership();

    if (teacher && membership?.role === "teacher") {
      redirect("/my-portal");
    } else {
      redirect("/dashboard");
    }
  } else {
    redirect("/login");
  }
}
