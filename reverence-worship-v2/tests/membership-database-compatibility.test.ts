import assert from "node:assert/strict";
import test from "node:test";
import { ColumnTypeEnum, type SqlDriverAdapterFactory, type SqlQuery } from "@prisma/driver-adapter-utils";
import { PrismaClient } from "../src/generated/prisma/client";

function clientWithStoredMembership(storedValue: string) {
  const queries: SqlQuery[] = [];
  const adapter: SqlDriverAdapterFactory = {
    provider: "postgres",
    adapterName: "membership-compatibility-test",
    async connect() {
      return {
        provider: "postgres",
        adapterName: "membership-compatibility-test",
        async queryRaw(query) {
          queries.push(query);
          return { columnNames: ["membership_type"], columnTypes: [ColumnTypeEnum.Enum], rows: [[storedValue]] };
        },
        async executeRaw() { throw new Error("Unexpected raw write in the membership compatibility test"); },
        async executeScript() { throw new Error("Unexpected schema change in the membership compatibility test"); },
        async startTransaction() { throw new Error("Unexpected transaction in the membership compatibility test"); },
        async dispose() {},
      };
    },
  };
  return { client: new PrismaClient({ adapter }), queries };
}

test("the generated client reads deployment-compatible membership values as the three public types", async () => {
  for (const [stored, expected] of [["permanent", "permanent"], ["temporary", "temporary"], ["visitor", "partner"]]) {
    const { client } = clientWithStoredMembership(stored);
    try {
      assert.deepEqual(await client.user.findMany({ select: { membershipType: true } }), [{ membershipType: expected }]);
    } finally {
      await client.$disconnect();
    }
  }
});

test("Partner queries and writes use the value supported by older deployed clients", async () => {
  const { client, queries } = clientWithStoredMembership("visitor");
  try {
    assert.deepEqual(await client.user.findMany({ where: { membershipType: "partner" }, select: { membershipType: true } }), [{ membershipType: "partner" }]);
    assert.ok(queries.at(-1)?.args.includes("visitor"));
    assert.deepEqual(await client.user.update({ where: { id: 1 }, data: { membershipType: "partner" }, select: { membershipType: true } }), { membershipType: "partner" });
    assert.ok(queries.at(-1)?.args.includes("visitor"));
    assert.ok(queries.every(query => !query.args.includes("partner")));
  } finally {
    await client.$disconnect();
  }
});
