export type MemberResultState =
  | "submitted"
  | "awaiting_review"
  | "pending_release"
  | "available"
  | "private";

export function memberResultState({
  isQuiz,
  releaseGrade,
  score,
  isReleased,
}: {
  isQuiz: boolean;
  releaseGrade: string;
  score: number | null;
  isReleased: boolean;
}): MemberResultState {
  if (!isQuiz) return "submitted";
  if (score === null) return "awaiting_review";
  if (releaseGrade === "immediately") return "available";
  if (releaseGrade === "later") return isReleased ? "available" : "pending_release";
  return "private";
}

export function memberCanViewScore(input: Parameters<typeof memberResultState>[0]) {
  return memberResultState(input) === "available";
}

export function memberResultLabel(state: MemberResultState) {
  const labels: Record<MemberResultState, string> = {
    submitted: "Submitted",
    awaiting_review: "Awaiting review",
    pending_release: "Pending release",
    available: "Result available",
    private: "Result private",
  };

  return labels[state];
}
