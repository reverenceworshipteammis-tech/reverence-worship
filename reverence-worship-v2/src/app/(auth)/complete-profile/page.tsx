import { redirect } from "next/navigation";
import { CompleteGoogleProfileForm } from "@/components/complete-google-profile-form";
import { getCurrentUser, needsGoogleProfileCompletion } from "@/lib/auth";

export default async function CompleteProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  if (!needsGoogleProfileCompletion(user)) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="mx-auto w-full">
      <CompleteGoogleProfileForm
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
          village: user.village,
        }}
      />
    </div>
  );
}
