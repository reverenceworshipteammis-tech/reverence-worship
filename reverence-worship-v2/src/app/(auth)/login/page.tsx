import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser, needsGoogleProfileCompletion } from "@/lib/auth";
import { isRegistrationEnabled } from "@/lib/system-settings";
import { authPathWithReturnTo, safeAuthReturnPath } from "@/lib/auth-return-path";

async function RegistrationLink() {
  if (!await isRegistrationEnabled()) return null;

  return (
    <p className="mt-4 text-center text-[0.82rem] text-gray-500">
      Need an account?{" "}
      <Link href="/register" className="auth-link font-semibold">
        Create one
      </Link>
    </p>
  );
}

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string; next?: string }> }) {
  const [user, params] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);
  const returnTo = safeAuthReturnPath(params?.next);

  if (user) {
    if (user.mustChangePassword) {
      redirect(authPathWithReturnTo("/change-password", returnTo));
    }
    if (needsGoogleProfileCompletion(user)) {
      redirect(authPathWithReturnTo("/complete-profile", returnTo));
    }
    redirect(returnTo);
  }

  return (
    <div className="auth-login-content mx-auto w-full max-w-sm">
      <LoginForm externalError={params?.error} returnTo={returnTo} />
      <Suspense fallback={<div className="h-9" aria-hidden="true" />}>
        <RegistrationLink />
      </Suspense>
    </div>
  );
}
