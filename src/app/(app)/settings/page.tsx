import { redirect } from "next/navigation";
import {
  getActiveOrganization,
  getCurrentTeacher,
  getCurrentMembership,
} from "@/lib/supabase/server";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { SettingsForm } from "@/components/settings/settings-form";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Einstellungen • Sprachschul-Manager",
};

export default async function SettingsPage() {
  const [teacher, membership, organization, tSettings] = await Promise.all([
    getCurrentTeacher(),
    getCurrentMembership(),
    getActiveOrganization(),
    getTranslations("settings"),
  ]);

  if (teacher && membership?.role === "teacher") {
    redirect("/my-portal");
  }

  if (!organization) {
    return <CreateOrganizationCard />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {tSettings("title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {tSettings("subtitle")}
        </p>
      </div>

      <SettingsForm organization={organization} />
    </div>
  );
}
