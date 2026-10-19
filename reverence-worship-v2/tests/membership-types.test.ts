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
} from "../src/lib/membership-types";

test("all membership choices and validation use Permanent, Temporary, and Partner", () => {
  assert.deepEqual(membershipTypeOptions, [
    { value: "permanent", label: "Permanent" },
    { value: "temporary", label: "Temporary" },
    { value: "partner", label: "Partner" },
  ]);
  assert.deepEqual(membershipTypeFilterOptions, [["permanent", "Permanent"], ["temporary", "Temporary"], ["partner", "Partner"]]);
  const schema = z.enum(MEMBERSHIP_TYPES);
  for (const type of MEMBERSHIP_TYPES) assert.equal(schema.safeParse(type).success, true);
  for (const value of ["visitor", "", "other", undefined, null]) assert.equal(schema.safeParse(value).success, false);
});

test("legacy Visitor labels and filters resolve to Partner without broadening recipients", () => {
  assert.equal(normalizeMembershipType(" Visitor "), "partner");
  assert.equal(membershipTypeLabel("visitor"), "Partner");
  assert.equal(membershipTypeLabel("temporary"), "Temporary");
  assert.equal(membershipTypeLabel(null), "Not specified");
  assert.equal(membershipTypeLabel(undefined, "N/A"), "N/A");
  assert.deepEqual(parseMembershipTypeFilters("visitor,partner,permanent,temporary,visitor"), ["partner", "permanent", "temporary"]);
  assert.deepEqual(parseMembershipTypeFilters(["visitor", "partner", null, "invalid"]), ["partner"]);
  assert.deepEqual(parseMembershipTypeFilters(null), []);
  assert.deepEqual(parseMembershipTypeFilters({ membershipTypes: ["partner"] }), []);
});

test("current and older membership exports import into the canonical types", () => {
  for (const value of ["Partner", "Visitor", "Partner Member", " visitor "]) assert.equal(importedMembershipType(value), "partner");
  assert.equal(importedMembershipType("Temporary Member"), "temporary");
  assert.equal(importedMembershipType("Permanent"), "permanent");
  assert.equal(importedMembershipType(""), null);
});
