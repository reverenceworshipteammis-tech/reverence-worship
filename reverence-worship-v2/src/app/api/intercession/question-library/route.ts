import { getSpiritualFormQuestionLibrary } from "@/app/admin/intercession/actions";

export async function GET() {
  const questions = await getSpiritualFormQuestionLibrary();
  return Response.json(questions, { headers: { "Cache-Control": "private, no-store" } });
}
