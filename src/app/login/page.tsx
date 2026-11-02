import { AuthForm } from "@/components/auth/auth-form";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";

export const metadata = {
  title: "Anmelden • Sprachschul-Manager",
  description: "Melden Sie sich bei Ihrer Sprachschul-Verwaltung an.",
};

export default async function LoginPage() {
  const activeOrg = await getActiveOrganization();
  let logoUrl = activeOrg?.logo_url || null;
  let organizationName = activeOrg?.name || null;

  if (!logoUrl) {
    try {
      const supabase = await createClient();
      const { data: org } = await supabase
        .from("organizations")
        .select("name, logo_url")
        .not("logo_url", "is", null)
        .limit(1)
        .maybeSingle();

      if (org?.logo_url) {
        logoUrl = org.logo_url;
        organizationName = org.name;
      }
    } catch {
      // Ignore if table access error
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative transition-colors">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <LanguageSwitcher />
      </div>
      <AuthForm logoUrl={logoUrl} organizationName={organizationName} />
    </div>
  );
}
