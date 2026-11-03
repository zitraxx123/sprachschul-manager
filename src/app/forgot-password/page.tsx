import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export const metadata = {
  title: "Passwort vergessen • Sprachschul-Manager",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative transition-colors">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <LanguageSwitcher />
      </div>
      <ForgotPasswordForm linkError={error === "link"} />
    </div>
  );
}
