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

test("font formatting preserves plain text, sizes, and nested emphasis", () => {
  const value = '<span data-font="georgia" data-size="24">Hello <strong>world</strong>\nNext</span>';
  assert.equal(intercessionRichTextToPlainText(value), "Hello world\nNext");
  const html = intercessionRichTextToSafeHtml(value);
  assert.match(html, /font-family:Georgia, serif;/);
  assert.match(html, /font-size:24px;/);
  assert.match(html, /<strong>world<\/strong><br>Next/);
});

test("font formatting rejects unsupported fonts and out-of-range sizes", () => {
  const html = intercessionRichTextToSafeHtml('<span data-font="untrusted" data-size="999">Safe</span>');
  assert.equal(html, "<span>Safe</span>");
  assert.equal(intercessionRichTextToSafeHtml('<span onclick="alert(1)">Unsafe</span>').includes('<span onclick='), false);
});
