export const ACTIVE_EXPENSE_STATUSES = new Set(["pending", "approved", "void_pending"]);

export function calculateContributionTermTarget(annualAmount: number, percentage: number) {
  if (!Number.isFinite(annualAmount) || annualAmount <= 0 || !Number.isFinite(percentage) || percentage <= 0) return 0;
  return (annualAmount * percentage) / 100;
}

export function calculateContributionRate(paidAmount: number, committedAmount: number) {
  if (!Number.isFinite(paidAmount) || paidAmount <= 0 || !Number.isFinite(committedAmount) || committedAmount <= 0) return 0;
  return Math.round((paidAmount / committedAmount) * 1000) / 10;
}

export function reconcileContributionPaymentAmounts(existingAmounts: number[], desiredTotal: number) {
  const desiredCents = Math.max(0, Math.round(desiredTotal * 100));
  const existingCents = existingAmounts.map((amount) => Math.max(0, Math.round(amount * 100)));
  const currentCents = existingCents.reduce((sum, amount) => sum + amount, 0);

  if (existingCents.length === 0) return [];
  if (desiredCents >= currentCents) {
    const reconciled = [...existingCents];
    reconciled[reconciled.length - 1] += desiredCents - currentCents;
    return reconciled.map((amount) => amount / 100);
  }

  let remainingCents = desiredCents;
  return existingCents.map((amount) => {
    const reconciledAmount = Math.min(amount, remainingCents);
    remainingCents -= reconciledAmount;
    return reconciledAmount / 100;
  });
}

export function validateContributionPaymentDate(input: { paymentDate: Date; startDate: Date; endDate: Date | null }) {
  if (input.paymentDate < input.startDate) return "Payment date cannot be before contributions open.";
  if (input.endDate && input.paymentDate > input.endDate) return "This contribution deadline has passed. Extend the deadline before recording another payment.";
  return null;
}

export function calculateAvailableBalance(input: {
  memberIncome: number;
  giftIncome: number;
  sponsorIncome: number;
  expenses: Array<{ amount: number; status?: string | null }>;
}) {
  const income = input.memberIncome + input.giftIncome + input.sponsorIncome;
  const reservedAndSpent = input.expenses
    .filter((expense) => ACTIVE_EXPENSE_STATUSES.has(expense.status ?? "pending"))
    .reduce((sum, expense) => sum + expense.amount, 0);
  return Math.max(income - reservedAndSpent, 0);
}

export function canApproveExpense(expense: { status?: string | null; approverId1: number | null }, userId: number) {
  return (expense.status === "pending" || expense.status === "void_pending") && expense.approverId1 === userId;
}

export function validateExpenseRequest(input: {
  amount: number;
  availableBalance: number;
  recorderId: number;
  approverId: number | null;
}) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return "Expense amount must be greater than zero.";
  if (!input.approverId) return "An approver is required.";
  if (input.approverId === input.recorderId) return "You cannot select yourself as the expense approver.";
  if (input.amount > input.availableBalance) {
    return `Expense cannot exceed the available account balance of RWF ${input.availableBalance.toLocaleString()}.`;
  }
  return null;
}
