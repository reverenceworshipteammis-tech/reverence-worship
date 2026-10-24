import { escapeIntercessionRichText, intercessionFonts } from "./intercession-rich-text";

type EditorNode = { nodeType: number; textContent: string | null; childNodes: ArrayLike<EditorNode>; tagName?: string; getAttribute?: (name: string) => string | null };

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
    else if (tag === "SPAN") {
      const font = node.getAttribute?.("data-font");
      const size = Number(node.getAttribute?.("data-size"));
      const attrs = `${font && Object.hasOwn(intercessionFonts, font) ? ` data-font="${font}"` : ""}${Number.isInteger(size) && size >= 10 && size <= 64 ? ` data-size="${size}"` : ""}`;
      result += attrs ? `<span${attrs}>${content}</span>` : content;
    } else result += content;
  }
  return result;
}
