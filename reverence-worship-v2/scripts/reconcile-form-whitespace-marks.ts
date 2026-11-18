import "dotenv/config";
import { Prisma } from "../src/generated/prisma/client";
import { parseIntercessionFormQuestions, reconcileIntercessionWhitespaceGrades } from "../src/lib/intercession-form-domain";
import { prisma } from "../src/lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply") || args.length > 1) {
    throw new Error("Usage: npm run forms:reconcile-whitespace-marks -- [--apply]");
  }
  const apply = args.includes("--apply");
  let cursor = 0;
  let corrected = 0;
  let addedPoints = 0;
  let reviewed = 0;
  let missingSnapshot = 0;
  let invalid = 0;
  let conflicts = 0;
  for (;;) {
    const submissions = await prisma.formSubmission.findMany({
      where: { id: { gt: cursor }, deletedAt: null, score: { not: null } },
      orderBy: { id: "asc" },
      take: 200,
      select: { id: true, formId: true, score: true, answers: true, manualGrades: true, questionSnapshot: true, reviewedAt: true, reviewedBy: true, updatedAt: true },
    });
    if (!submissions.length) break;
    for (const submission of submissions) {
      cursor = submission.id;
      if (submission.reviewedAt || submission.reviewedBy) {
        reviewed++;
        console.warn(`Skipped submission ${submission.id} (form ${submission.formId}): manually reviewed.`);
        continue;
      }
      if (!Array.isArray(submission.questionSnapshot) || submission.questionSnapshot.length === 0) {
        missingSnapshot++;
        console.warn(`Skipped submission ${submission.id} (form ${submission.formId}): missing question snapshot.`);
        continue;
      }
      if (submission.score === null) continue;
      const result = reconcileIntercessionWhitespaceGrades(
        parseIntercessionFormQuestions(submission.questionSnapshot),
        submission.answers,
        submission.manualGrades,
        submission.score,
      );
      if (result.status === "invalid") {
        invalid++;
        console.warn(`Skipped submission ${submission.id} (form ${submission.formId}): invalid or inconsistent grades.`);
        continue;
      }
      if (result.status !== "corrected") continue;
      if (apply) {
        const updated = await prisma.formSubmission.updateMany({
          where: { id: submission.id, updatedAt: submission.updatedAt, deletedAt: null, reviewedAt: null, reviewedBy: null },
          data: { manualGrades: result.grades as Prisma.InputJsonValue, score: result.score },
        });
        if (updated.count !== 1) {
          conflicts++;
          console.warn(`Submission ${submission.id} changed during reconciliation; rerun the command.`);
          continue;
        }
      }
      corrected++;
      addedPoints += result.addedPoints;
      console.log(`${apply ? "Corrected" : "Would correct"} submission ${submission.id} (form ${submission.formId}): +${result.addedPoints} point(s).`);
    }
  }
  console.log(`${apply ? "Corrected" : "Would correct"} ${corrected} submission(s), adding ${Math.round(addedPoints * 10000) / 10000} point(s).`);
  console.log(`Skipped: ${reviewed} reviewed, ${missingSnapshot} without a question snapshot, ${invalid} with invalid or inconsistent grades, ${conflicts} concurrently changed.`);
  if (conflicts) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
