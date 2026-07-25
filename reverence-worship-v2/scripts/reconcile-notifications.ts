import "dotenv/config";
import { reconcilePendingPermissionNotifications } from "../src/lib/notifications";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await reconcilePendingPermissionNotifications();
  const pendingEmails = await prisma.emailDelivery.count({ where: { status: "pending" } });
  const failedEmails = await prisma.emailDelivery.count({ where: { status: "failed" } });
  console.log(
    `Checked ${result.requests} pending permission request(s) for ${result.approvers} approver(s). ` +
    `Email queue: ${pendingEmails} pending, ${failedEmails} failed.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
