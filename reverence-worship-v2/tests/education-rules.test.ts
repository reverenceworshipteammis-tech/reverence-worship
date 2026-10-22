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
    otherEducationLevel: "",
    educationFieldOfStudy: "",
    educationInstitution: "",
    educationCompletionYear: "",
    additionalQualifications: [],
  });

  assert.equal(result.success, true);
});

test("primary level does not require additional education details", () => {
  const result = educationFieldsSchema.safeParse({
    highestEducationLevel: "primary",
    otherEducationLevel: "",
    educationFieldOfStudy: "",
    educationInstitution: "",
    educationCompletionYear: "",
    additionalQualifications: [],
  });

  assert.equal(result.success, true);
});

test("formal education requires its qualification details and other specification", () => {
  const missingDetails = educationFieldsSchema.safeParse({
    highestEducationLevel: "bachelors_a0",
    otherEducationLevel: "",
    educationFieldOfStudy: "",
    educationInstitution: "",
    educationCompletionYear: "",
    additionalQualifications: [],
  });
  const missingOther = educationFieldsSchema.safeParse({
    highestEducationLevel: "other",
    otherEducationLevel: "",
    educationFieldOfStudy: "History",
    educationInstitution: "University",
    educationCompletionYear: "2020",
    additionalQualifications: [],
  });

  assert.equal(missingDetails.success, false);
  assert.equal(missingOther.success, false);
});

test("supports multiple complete additional qualifications", () => {
  const result = educationFieldsSchema.safeParse({
    highestEducationLevel: "none",
    otherEducationLevel: "",
    educationFieldOfStudy: "",
    educationInstitution: "",
    educationCompletionYear: "",
    additionalQualifications: [
      { name: "CCNA", fieldOfStudy: "Networking", institution: "Cisco", status: "completed", completionYear: 2022 },
      { name: "CPA", fieldOfStudy: "Accounting", institution: "Training Provider", status: "studying", completionYear: 2027 },
    ],
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.additionalQualifications.length, 2);
});
