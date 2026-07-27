import assert from "node:assert/strict";
import test from "node:test";
import { formatEmailMessage } from "../src/lib/email-html";

test("email messages preserve written line and paragraph breaks", () => {
  assert.equal(
    formatEmailMessage("First paragraph.\n\nSecond paragraph.\nThird line."),
    "First paragraph.<br><br>Second paragraph.<br>Third line.",
  );
});

test("email messages preserve Windows line endings without allowing HTML", () => {
  assert.equal(
    formatEmailMessage("<strong>First</strong>\r\n\r\nSecond & final."),
    "&lt;strong&gt;First&lt;/strong&gt;<br><br>Second &amp; final.",
  );
});
