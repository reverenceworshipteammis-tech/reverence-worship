import assert from "node:assert/strict";
import test from "node:test";
import {
  excludeSuperAdminUserWhere,
  hasSuperAdminRole,
} from "../src/lib/system-account-rules";

test("Super Admin is identified as a protected system account", () => {
  assert.equal(hasSuperAdminRole(["member", "super-admin"]), true);
  assert.equal(hasSuperAdminRole(["member", "admin"]), false);
});

test("normal-user queries exclude accounts with the Super Admin role", () => {
  assert.deepEqual(excludeSuperAdminUserWhere(), {
    roles: {
      none: {
        role: { name: "super-admin" },
      },
    },
  });
});
