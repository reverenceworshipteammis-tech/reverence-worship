import assert from "node:assert/strict";
import test from "node:test";
import { educationFieldsSchema, EDUCATION_LEVELS } from "../src/lib/education-rules";

test("education levels include the required options", () => {
  assert.deepEqual(EDUCATION_LEVELS.map(({ label }) => label), [
    "No Formal Education",
    "Primary Level",
    "Secondary School (A2)",
    "Diploma (A1)",
    "Bachelor's Degree (A0)",
    "Master's Degree",
    "Doctoral Degree (PhD)",
    "Other (Please Specify)",
  ]);
});

test("no formal education does not require primary education details", () => {
  const result = educationFieldsSchema.safeParse({
    highestEducationLevel: "none",
    educationFieldOfStudy: "",
    additionalQualifications: [],
  });

  assert.equal(result.success, true);
});

test("primary level does not require additional education details", () => {
  const result = educationFieldsSchema.safeParse({
    highestEducationLevel: "primary",
    educationFieldOfStudy: "",
    additionalQualifications: [],
  });

  assert.equal(result.success, true);
});

test("formal education requires its qualification details", () => {
  const missingDetails = educationFieldsSchema.safeParse({
    highestEducationLevel: "bachelors_a0",
    educationFieldOfStudy: "",
    additionalQualifications: [],
  });

  assert.equal(missingDetails.success, false);
});

test("supports multiple complete additional qualifications", () => {
  const result = educationFieldsSchema.safeParse({
    highestEducationLevel: "none",
    educationFieldOfStudy: "",
    additionalQualifications: [
      { name: "CCNA", fieldOfStudy: "Networking", institution: "Cisco", status: "completed", completionYear: 2022 },
      { name: "CPA", fieldOfStudy: "Accounting", institution: "Training Provider", status: "studying", completionYear: 2027 },
    ],
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.additionalQualifications.length, 2);
});
