import assert from "node:assert/strict";
import test from "node:test";
import { canMemberCommitAnnualContribution, parseAnnualContributionAmount } from "../src/lib/annual-contribution-rules";
import { calculateAvailableBalance, calculateContributionRate, calculateContributionTermTarget, canApproveExpense, validateContributionPaymentDate, validateExpenseRequest } from "../src/lib/finance-rules";

test("member annual contribution commitments require a positive valid amount", () => {
  assert.equal(parseAnnualContributionAmount("250000"), 250000);
  assert.equal(parseAnnualContributionAmount("250000.50"), 250000.5);
  assert.equal(parseAnnualContributionAmount("0"), null);
  assert.equal(parseAnnualContributionAmount("-100"), null);
  assert.equal(parseAnnualContributionAmount("100.999"), null);
  assert.equal(parseAnnualContributionAmount("not-a-number"), null);
});

test("member annual contribution commitments are available only when administrators enable them", () => {
  assert.equal(canMemberCommitAnnualContribution({ allowMemberCommitment: true }), true);
  assert.equal(canMemberCommitAnnualContribution({ allowMemberCommitment: false }), false);
  assert.equal(canMemberCommitAnnualContribution(null), false);
});

test("contribution term targets follow the saved percentages", () => {
  assert.equal(calculateContributionTermTarget(2000, 33.33), 666.6);
  assert.equal(calculateContributionTermTarget(2000, 33.34), 666.8);
});

test("contribution rates preserve amounts above 100 percent", () => {
  assert.equal(calculateContributionRate(60000, 60000), 100);
  assert.equal(calculateContributionRate(80000, 60000), 133.3);
  assert.equal(calculateContributionRate(100, 0), 0);
});

test("other contribution payments stay within the contribution window", () => {
  const startDate = new Date("2026-08-01T12:00:00.000Z");
  const endDate = new Date("2026-08-31T12:00:00.000Z");
  assert.match(validateContributionPaymentDate({ paymentDate: new Date("2026-07-31T12:00:00.000Z"), startDate, endDate }) ?? "", /before contributions open/);
  assert.equal(validateContributionPaymentDate({ paymentDate: new Date("2026-08-31T12:00:00.000Z"), startDate, endDate }), null);
  assert.match(validateContributionPaymentDate({ paymentDate: new Date("2026-09-01T12:00:00.000Z"), startDate, endDate }) ?? "", /deadline has passed/);
  assert.equal(validateContributionPaymentDate({ paymentDate: new Date("2026-09-01T12:00:00.000Z"), startDate, endDate: null }), null);
});

test("pending expenses reserve funds while rejected and voided expenses do not", () => {
  assert.equal(calculateAvailableBalance({
    memberIncome: 700,
    giftIncome: 200,
    sponsorIncome: 100,
    expenses: [
      { amount: 250, status: "pending" },
      { amount: 100, status: "approved" },
      { amount: 500, status: "rejected" },
      { amount: 500, status: "voided" },
    ],
  }), 650);
});

test("balance never becomes negative", () => {
  assert.equal(calculateAvailableBalance({ memberIncome: 100, giftIncome: 0, sponsorIncome: 0, expenses: [{ amount: 150, status: "approved" }] }), 0);
});

test("only the selected approver can approve a pending expense", () => {
  assert.equal(canApproveExpense({ status: "pending", approverId1: 9 }, 9), true);
  assert.equal(canApproveExpense({ status: "pending", approverId1: 9 }, 8), false);
  assert.equal(canApproveExpense({ status: "approved", approverId1: 9 }, 9), false);
  assert.equal(canApproveExpense({ status: "void_pending", approverId1: 9 }, 9), true);
});

test("expense validation requires a different approver and enough funds", () => {
  assert.equal(validateExpenseRequest({ amount: 10, availableBalance: 100, recorderId: 1, approverId: null }), "An approver is required.");
  assert.equal(validateExpenseRequest({ amount: 10, availableBalance: 100, recorderId: 1, approverId: 1 }), "You cannot select yourself as the expense approver.");
  assert.match(validateExpenseRequest({ amount: 101, availableBalance: 100, recorderId: 1, approverId: 2 }) ?? "", /cannot exceed/);
  assert.equal(validateExpenseRequest({ amount: 100, availableBalance: 100, recorderId: 1, approverId: 2 }), null);
});
