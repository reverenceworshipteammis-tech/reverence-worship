import { IntercessionFormBuilder } from "@/components/intercession-form-builder";
import { requirePermission } from "@/lib/auth";

export default async function CreateIntercessionFormPage() {
  await requirePermission("intercession", "create-forms", "/admin/intercession");

  return <IntercessionFormBuilder />;
}
