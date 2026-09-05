import { redirect } from "next/navigation";
import { RequiredPasswordChangeForm } from "@/components/required-password-change-form";
import { getCurrentUser } from "@/lib/auth";
import { authPathWithReturnTo, safeAuthReturnPath } from "@/lib/auth-return-path";

export default async function ChangePasswordPage({ searchParams }: { searchParams?: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const returnTo = safeAuthReturnPath(params?.next);
  const user = await getCurrentUser();

  if (!user) {
    redirect(authPathWithReturnTo("/login", returnTo));
  }

  if (!user.mustChangePassword) {
    redirect(returnTo);
  }

  return (
    <div className="mx-auto w-full">
      <RequiredPasswordChangeForm returnTo={returnTo} />
    </div>
  );
}
