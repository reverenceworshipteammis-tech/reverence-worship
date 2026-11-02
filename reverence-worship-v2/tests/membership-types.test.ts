import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import {
  MEMBERSHIP_TYPES,
  importedMembershipType,
  membershipTypeFilterOptions,
  membershipTypeLabel,
  membershipTypeOptions,
  normalizeMembershipType,
  parseMembershipTypeFilters,
  reportMembershipTypeLabel,
  reportMembershipTypeValue,
} from "../src/lib/membership-types";

test("all membership choices and validation use Permanent, Non-Permanent, and Partner", () => {
  assert.deepEqual(membershipTypeOptions, [
    { value: "permanent", label: "Permanent" },
    { value: "temporary", label: "Non-Permanent" },
    { value: "partner", label: "Partner" },
  ]);
  assert.deepEqual(membershipTypeFilterOptions, [["permanent", "Permanent"], ["temporary", "Non-Permanent"], ["partner", "Partner"]]);
  const schema = z.enum(MEMBERSHIP_TYPES);
  for (const type of MEMBERSHIP_TYPES) assert.equal(schema.safeParse(type).success, true);
  for (const value of ["visitor", "", "other", undefined, null]) assert.equal(schema.safeParse(value).success, false);
});

test("report membership type shows In-Probation for members on open probation", () => {
  assert.equal(reportMembershipTypeValue("permanent", true), "in-probation");
  assert.equal(reportMembershipTypeValue("temporary", true), "in-probation");
  assert.equal(reportMembershipTypeValue("permanent", false), "permanent");
  assert.equal(reportMembershipTypeValue(null, false), "unspecified");
  assert.equal(reportMembershipTypeLabel("permanent", true), "In-Probation");
  assert.equal(reportMembershipTypeLabel("permanent", false), "Permanent");
  assert.equal(reportMembershipTypeLabel(null, false), "Not specified");
});

test("legacy Visitor labels and filters resolve to Partner without broadening recipients", () => {
  assert.equal(normalizeMembershipType(" Visitor "), "partner");
  assert.equal(membershipTypeLabel("visitor"), "Partner");
  assert.equal(membershipTypeLabel("temporary"), "Non-Permanent");
  assert.equal(membershipTypeLabel(null), "Not specified");
  assert.equal(membershipTypeLabel(undefined, "N/A"), "N/A");
  assert.deepEqual(parseMembershipTypeFilters("visitor,partner,permanent,temporary,visitor"), ["partner", "permanent", "temporary"]);
  assert.deepEqual(parseMembershipTypeFilters(["visitor", "partner", null, "invalid"]), ["partner"]);
  assert.deepEqual(parseMembershipTypeFilters(null), []);
  assert.deepEqual(parseMembershipTypeFilters({ membershipTypes: ["partner"] }), []);
});

test("current and older membership exports import into the canonical types", () => {
  for (const value of ["Partner", "Visitor", "Partner Member", " visitor "]) assert.equal(importedMembershipType(value), "partner");
  for (const value of ["Non-Permanent", "Non-Permanent Member", "non permanent", "Temporary Member"]) {
    assert.equal(importedMembershipType(value), "temporary");
  }
  assert.equal(importedMembershipType("Permanent"), "permanent");
  assert.equal(importedMembershipType(""), null);
});
