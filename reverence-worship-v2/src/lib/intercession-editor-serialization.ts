import { escapeIntercessionRichText } from "./intercession-rich-text";

type EditorNode = { nodeType: number; textContent: string | null; childNodes: ArrayLike<EditorNode>; tagName?: string };

export function serializeIntercessionEditor(parent: EditorNode): string {
  let result = "";
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === 3) { result += escapeIntercessionRichText(node.textContent ?? ""); continue; }
    if (node.nodeType !== 1) continue;
    const tag = node.tagName?.toUpperCase();
    if (tag === "BR") { result += "\n"; continue; }
    const content = serializeIntercessionEditor(node);
    if (tag === "DIV" || tag === "P") {
      if (result && !result.endsWith("\n")) result += "\n";
      result += content;
      if (!content.endsWith("\n")) result += "\n";
    } else if (tag === "STRONG" || tag === "B") result += `<strong>${content}</strong>`;
    else if (tag === "EM" || tag === "I") result += `<em>${content}</em>`;
    else result += content;
  }
  return result;
}
