import { redirect } from "next/navigation";
import { RequiredPasswordChangeForm } from "@/components/required-password-change-form";
import { getCurrentUser } from "@/lib/auth";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.mustChangePassword) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="mx-auto w-full">
      <RequiredPasswordChangeForm />
    </div>
  );
}
