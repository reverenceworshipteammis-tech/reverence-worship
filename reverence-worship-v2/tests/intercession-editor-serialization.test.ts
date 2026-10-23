import assert from "node:assert/strict";
import test from "node:test";
import { serializeIntercessionEditor } from "../src/lib/intercession-editor-serialization";
import { intercessionRichTextToSafeHtml } from "../src/lib/intercession-rich-text";

const text = (value: string) => ({ nodeType: 3, textContent: value, childNodes: [] });
type Node = { nodeType: number; textContent: string | null; childNodes: Node[]; tagName?: string };
const element = (tagName: string, ...childNodes: Node[]): Node => ({ nodeType: 1, tagName, textContent: null, childNodes });
test("Enter after inline text preserves the new line", () => {
  assert.equal(serializeIntercessionEditor(element("DIV", text("First"), element("DIV", text("Second")))).trimEnd(), "First\nSecond");
});
test("blank editor paragraphs survive saving and rendering", () => {
  const saved = serializeIntercessionEditor(element("DIV", text("First"), element("DIV", element("BR")), element("DIV", element("STRONG", text("Second"))))).trimEnd();
  assert.equal(saved, "First\n\n<strong>Second</strong>");
  assert.equal(intercessionRichTextToSafeHtml(saved), "First<br><br><strong>Second</strong>");
});
test("paragraph placeholders do not double line spacing", () => {
  assert.equal(serializeIntercessionEditor(element("DIV", element("P", text("First")), element("P", element("BR")), element("P", text("Last")))).trimEnd(), "First\n\nLast");
});
