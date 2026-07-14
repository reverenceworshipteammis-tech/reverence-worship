import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { isRegistrationEnabled } from "@/lib/system-settings";

export default async function LoginPage() {
  const [user, registrationEnabled] = await Promise.all([
    getCurrentUser(),
    isRegistrationEnabled(),
  ]);

  if (user) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <LoginForm registrationEnabled={registrationEnabled} />
    </div>
  );
}
