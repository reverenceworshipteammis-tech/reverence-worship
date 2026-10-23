export function intercessionMobileSteps(questions: Array<{ type: string }>): number[] {
  let step = 0;
  let count = 0;
  return questions.map((question, position) => {
    if (position > 0 && (question.type === "section_break" || count >= 5)) { step += 1; count = 0; }
    if (!["title_section", "section_break"].includes(question.type)) count += 1;
    return step;
  });
}
