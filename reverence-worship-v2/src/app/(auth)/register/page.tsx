import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getCurrentUser } from "@/lib/auth";
import { isRegistrationEnabled } from "@/lib/system-settings";
import { prisma } from "@/lib/prisma";

export default async function RegisterPage() {
  const [user, registrationEnabled, userCount] = await Promise.all([
    getCurrentUser(),
    isRegistrationEnabled(),
    prisma.user.count(),
  ]);

  if (user) {
    redirect("/admin/dashboard");
  }

  if (!registrationEnabled && userCount > 0) {
    redirect("/login");
  }

  return (
    <div className="w-full">
      <RegisterForm />
    </div>
  );
}
