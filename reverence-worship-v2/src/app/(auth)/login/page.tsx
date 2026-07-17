import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { isRegistrationEnabled } from "@/lib/system-settings";
import { oauthErrorMessage } from "@/lib/oauth-errors";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const [user, registrationEnabled] = await Promise.all([
    getCurrentUser(),
    isRegistrationEnabled(),
  ]);
  const params = await searchParams;

  if (user) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="auth-login-content mx-auto w-full max-w-sm">
      <LoginForm registrationEnabled={registrationEnabled} externalError={params?.error} />
    </div>
  );
}
