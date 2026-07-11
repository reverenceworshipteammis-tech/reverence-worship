import { IntercessionFormBuilder } from "@/components/intercession-form-builder";
import { requireUser } from "@/lib/auth";

export default async function CreateIntercessionFormPage() {
  await requireUser();

  return <IntercessionFormBuilder />;
}
