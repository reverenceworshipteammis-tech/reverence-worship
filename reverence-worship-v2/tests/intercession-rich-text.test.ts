import assert from "node:assert/strict";
import test from "node:test";
import {
  intercessionRichTextToPlainText,
  intercessionRichTextToSafeHtml,
  parseIntercessionRichText,
} from "../src/lib/intercession-rich-text";

test("intercession rich text preserves bold, italic, nesting, and line breaks", () => {
  const value = "A <strong>bold <em>and italic</em></strong> line\nNext";
  assert.equal(intercessionRichTextToPlainText(value), "A bold and italic line\nNext");
  assert.equal(intercessionRichTextToSafeHtml(value), "A <strong>bold <em>and italic</em></strong> line<br>Next");
  assert.equal(parseIntercessionRichText(value)[1]?.type, "strong");
});

test("intercession rich text escapes arbitrary HTML", () => {
  const value = '<img src=x onerror=alert(1)> &lt;safe&gt; <strong>yes</strong>';
  assert.equal(
    intercessionRichTextToSafeHtml(value),
    "&lt;img src=x onerror=alert(1)&gt; &lt;safe&gt; <strong>yes</strong>",
  );
});
