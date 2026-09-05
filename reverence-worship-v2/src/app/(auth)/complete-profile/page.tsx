import { redirect } from "next/navigation";
import { CompleteGoogleProfileForm } from "@/components/complete-google-profile-form";
import { getCurrentUser, needsGoogleProfileCompletion } from "@/lib/auth";
import { authPathWithReturnTo, safeAuthReturnPath } from "@/lib/auth-return-path";

export default async function CompleteProfilePage({ searchParams }: { searchParams?: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const returnTo = safeAuthReturnPath(params?.next);
  const user = await getCurrentUser();

  if (!user) {
    redirect(authPathWithReturnTo("/login", returnTo));
  }

  if (user.mustChangePassword) {
    redirect(authPathWithReturnTo("/change-password", returnTo));
  }

  if (!needsGoogleProfileCompletion(user)) {
    redirect(returnTo);
  }

  return (
    <div className="mx-auto w-full">
      <CompleteGoogleProfileForm
        returnTo={returnTo}
        user={{
          name: user.name,
          email: user.email,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : "",
          gender: user.gender,
          maritalStatus: user.maritalStatus,
          province: user.province,
          district: user.district,
          sector: user.sector,
          cell: user.cell,
          village: user.village,
        }}
      />
    </div>
  );
}
