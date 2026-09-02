import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getCurrentUser } from "@/lib/auth";
import { isTransientDatabaseError, withDatabaseRetry } from "@/lib/database-retry";
import { isRegistrationEnabled } from "@/lib/system-settings";
import { prisma } from "@/lib/prisma";

export default async function RegisterPage() {
  let user;
  let registrationEnabled: boolean;
  let userCount: number;

  try {
    [user, registrationEnabled, userCount] = await withDatabaseRetry(() => Promise.all([
      getCurrentUser(),
      isRegistrationEnabled(),
      prisma.user.count(),
    ]), 3);
  } catch (error) {
    if (!isTransientDatabaseError(error)) throw error;

    // The action performs the authoritative registration-enabled check. Keeping
    // this page mounted lets it display a recoverable form error instead of the
    // development/runtime error overlay during a temporary database outage.
    console.warn("Registration page data is temporarily unavailable; rendering the recoverable form state.");
    return (
      <div className="auth-register-content w-full">
        <RegisterForm />
      </div>
    );
  }

  if (user) {
    redirect("/admin/dashboard");
  }

  if (!registrationEnabled && userCount > 0) {
    redirect("/login");
  }

  return (
    <div className="auth-register-content w-full">
      <RegisterForm />
    </div>
  );
}
