import assert from "node:assert/strict";
import test from "node:test";
import {
  isManagedQuestionImagePath,
  MAX_QUESTION_IMAGES,
  parseQuestionImages,
  questionImagePaths,
} from "../src/lib/intercession-question-images";

const localPath = (index: number) => `/uploads/forms/question-${index}.png`;

test("question images accept only managed local and Vercel Blob paths", () => {
  assert.equal(isManagedQuestionImagePath(localPath(1)), true);
  assert.equal(isManagedQuestionImagePath("https://store.public.blob.vercel-storage.com/uploads/forms/question.webp"), true);
  assert.equal(isManagedQuestionImagePath("https://example.com/question.png"), false);
  assert.equal(isManagedQuestionImagePath("/uploads/forms/../private.png"), false);
});

test("question images are normalized and limited to five valid entries", () => {
  const images = parseQuestionImages([
    { path: "https://example.com/not-managed.png", alt: "Invalid" },
    ...Array.from({ length: 7 }, (_, index) => ({
      id: `image-${index + 1}`,
      path: localPath(index + 1),
      alt: ` Image ${index + 1} `,
    })),
  ]);

  assert.equal(images.length, MAX_QUESTION_IMAGES);
  assert.deepEqual(images.map((image) => image.path), Array.from({ length: 5 }, (_, index) => localPath(index + 1)));
  assert.equal(images[0].alt, "Image 1");
});

test("question image paths collect managed images across questions", () => {
  assert.deepEqual(questionImagePaths([
    { label: "First", images: [{ id: "one", path: localPath(1), alt: "" }] },
    { label: "Second", images: [{ id: "two", path: "https://example.com/no.png", alt: "" }, { id: "three", path: localPath(2), alt: "" }] },
  ]), [localPath(1), localPath(2)]);
});
