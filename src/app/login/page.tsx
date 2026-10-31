import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Anmelden • Sprachschul-Manager",
  description: "Melden Sie sich bei Ihrer Sprachschul-Verwaltung an.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AuthForm />
    </div>
  );
}
