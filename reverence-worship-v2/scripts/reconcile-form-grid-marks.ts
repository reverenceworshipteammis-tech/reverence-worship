import "dotenv/config";
import { closeSync, fsyncSync, openSync, writeFileSync, writeSync } from "node:fs";
import { Prisma } from "../src/generated/prisma/client";
import { parseIntercessionFormQuestions, parseIntercessionFormSettings, reconcileIntercessionMultipleChoiceGridGrades } from "../src/lib/intercession-form-domain";
import { prisma } from "../src/lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const backups = args.filter((arg) => arg.startsWith("--backup="));
  const confirmations = args.filter((arg) => arg.startsWith("--confirmed-partial-submission="));
  if (args.some((arg) => arg !== "--apply" && !arg.startsWith("--backup=") && !arg.startsWith("--confirmed-partial-submission="))
    || args.filter((arg) => arg === "--apply").length > 1 || backups.length > 1 || confirmations.length > 1) {
    throw new Error("Usage: npm run forms:reconcile-grid-marks -- [--apply --backup=<new-file-path>] [--confirmed-partial-submission=<id>]");
  }
  const apply = args.includes("--apply");
  const backupPath = backups[0]?.slice("--backup=".length);
  const confirmation = confirmations[0]?.slice("--confirmed-partial-submission=".length);
  if (confirmation !== undefined && (!/^[1-9]\d*$/.test(confirmation) || !Number.isSafeInteger(Number(confirmation)))) {
    throw new Error("The confirmed submission must be a positive integer ID.");
  }
  const confirmedSubmissionId = confirmation === undefined ? null : Number(confirmation);
  if (apply !== Boolean(backupPath)) {
    throw new Error("Applying corrections requires --backup=<new-file-path>; previews do not create a backup.");
  }
  if (backupPath) writeFileSync(backupPath, "", { flag: "wx", mode: 0o600 });
  let cursor = 0;
  let corrected = 0;
  let addedPoints = 0;
  let reviewed = 0;
  let missingSnapshot = 0;
  let uncertainSettings = 0;
  let partialDisabled = 0;
  let invalid = 0;
  let unexpectedGrades = 0;
  let conflicts = 0;
  for (;;) {
    const submissions = await prisma.formSubmission.findMany({
      where: { id: { gt: cursor }, deletedAt: null, score: { not: null } },
      orderBy: { id: "asc" },
      take: 200,
      select: {
        id: true, formId: true, score: true, answers: true, manualGrades: true, questionSnapshot: true,
        reviewedAt: true, reviewedBy: true, submittedAt: true, updatedAt: true,
        form: { select: { settings: true, updatedAt: true } },
      },
    });
    if (!submissions.length) break;
    for (const submission of submissions) {
      cursor = submission.id;
      if (!Array.isArray(submission.questionSnapshot) || submission.questionSnapshot.length === 0) {
        missingSnapshot++;
        console.warn(`Skipped submission ${submission.id} (form ${submission.formId}): missing question snapshot.`);
        continue;
      }
      const questions = parseIntercessionFormQuestions(submission.questionSnapshot);
      if (!questions.some((question) => question.type === "multiple_choice_grid")) continue;
      if (submission.score === null) continue;
      const result = reconcileIntercessionMultipleChoiceGridGrades(questions, submission.answers, submission.manualGrades, submission.score);
      if (result.status === "invalid") {
        invalid++;
        console.warn(`Skipped submission ${submission.id} (form ${submission.formId}): invalid or inconsistent grades.`);
        continue;
      }
      if (result.status === "unchanged") continue;
      if (submission.reviewedAt || submission.reviewedBy) {
        reviewed++;
        console.warn(`Skipped submission ${submission.id} (form ${submission.formId}): manually reviewed.`);
        continue;
      }
      const partialConfirmed = submission.id === confirmedSubmissionId;
      if (submission.form.updatedAt > submission.submittedAt && !partialConfirmed) {
        uncertainSettings++;
        console.warn(`Skipped submission ${submission.id} (form ${submission.formId}): form settings may have changed since submission.`);
        continue;
      }
      if (!partialConfirmed && !parseIntercessionFormSettings(submission.form.settings).allow_partial_points) {
        partialDisabled++;
        continue;
      }
      if (result.status === "review") {
        unexpectedGrades++;
        console.warn(`Skipped submission ${submission.id} (form ${submission.formId}): grid marks do not match the previous grading rule.`);
        continue;
      }
      if (apply && backupPath) {
        const backup = openSync(backupPath, "a");
        try {
          writeSync(backup, `${JSON.stringify({
            id: submission.id, formId: submission.formId, score: submission.score,
            manualGrades: submission.manualGrades, updatedAt: submission.updatedAt,
          })}\n`);
          fsyncSync(backup);
        } finally {
          closeSync(backup);
        }
        const updated = await prisma.formSubmission.updateMany({
          where: {
            id: submission.id, updatedAt: submission.updatedAt, deletedAt: null, reviewedAt: null, reviewedBy: null,
            form: { updatedAt: submission.form.updatedAt },
          },
          data: { manualGrades: result.grades as Prisma.InputJsonValue, score: result.score },
        });
        if (updated.count !== 1) {
          conflicts++;
          console.warn(`Submission ${submission.id} or its form changed during reconciliation; rerun the command.`);
          continue;
        }
      }
      corrected++;
      addedPoints += result.addedPoints;
      console.log(`${apply ? "Corrected" : "Would correct"} submission ${submission.id} (form ${submission.formId}): +${result.addedPoints} point(s).`);
    }
  }
  console.log(`${apply ? "Corrected" : "Would correct"} ${corrected} submission(s), adding ${Math.round(addedPoints * 10000) / 10000} point(s).`);
  console.log(`Skipped: ${reviewed} reviewed, ${missingSnapshot} without a question snapshot, ${uncertainSettings} with uncertain historical settings, ${partialDisabled} with partial points disabled, ${invalid} with invalid or inconsistent grades, ${unexpectedGrades} with unexpected grid marks, ${conflicts} concurrently changed.`);
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
