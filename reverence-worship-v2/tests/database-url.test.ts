import assert from "node:assert/strict";
import test from "node:test";
import { parse } from "pg-connection-string";
import { normalizePostgresSslMode } from "../src/lib/database-url";

test("ambiguous PostgreSQL SSL modes become explicit certificate and hostname verification", () => {
  for (const protocol of ["postgres", "postgresql", "pg"]) {
    for (const mode of ["prefer", "require", "verify-ca"]) {
      const normalized = normalizePostgresSslMode(`${protocol}://user:secret@db.example.test/app?sslmode=${mode}`)!;
      assert.equal(new URL(normalized).searchParams.get("sslmode"), "verify-full");
      assert.equal(normalizePostgresSslMode(normalized), normalized);
    }
  }
});

test("normalization preserves credentials, connection targets, and other database options", () => {
  const original = new URL("postgresql://member:p%40ss%3A%2F%23%26@db.example.test:5433/worship?sslmode=require&channel_binding=require&application_name=web+app&connect_timeout=15&sslrootcert=%2Fprivate%2Fdb-ca.pem");
  const normalized = new URL(normalizePostgresSslMode(original.toString())!);
  for (const field of ["username", "password", "hostname", "port", "pathname"] as const) assert.equal(normalized[field], original[field]);
  for (const key of ["channel_binding", "application_name", "connect_timeout", "sslrootcert"]) assert.equal(normalized.searchParams.get(key), original.searchParams.get(key));
});

test("node-postgres retains full certificate verification for normalized SSL aliases", () => {
  const strict = parse("postgresql://user:secret@db.example.test/app?sslmode=verify-full");
  for (const mode of ["prefer", "require", "verify-ca"]) {
    const parsed = parse(normalizePostgresSslMode(`postgresql://user:secret@db.example.test/app?sslmode=${mode}`)!);
    assert.deepEqual(parsed, strict);
    assert.equal(typeof parsed.ssl, "object");
    if (typeof parsed.ssl === "object") assert.notEqual(parsed.ssl.rejectUnauthorized, false);
  }
});

test("explicit SSL modes and requested libpq compatibility retain their configured behavior", () => {
  for (const query of ["", "?sslmode=verify-full", "?sslmode=disable", "?sslmode=no-verify", "?ssl=true", "?uselibpqcompat=true&sslmode=require", "?sslmode=verify-ca&uselibpqcompat=true"]) {
    const connectionString = `postgresql://user:secret@db.example.test/app${query}`;
    assert.equal(normalizePostgresSslMode(connectionString), connectionString);
  }
});

test("duplicate SSL parameters follow the database driver's last-value behavior", () => {
  const base = "postgresql://user:secret@db.example.test/app?";
  const normalized = new URL(normalizePostgresSslMode(`${base}sslmode=disable&sslmode=require`)!);
  assert.deepEqual(normalized.searchParams.getAll("sslmode"), ["verify-full"]);
  assert.equal(normalizePostgresSslMode(`${base}sslmode=require&sslmode=disable`), `${base}sslmode=require&sslmode=disable`);
  assert.equal(new URL(normalizePostgresSslMode(`${base}uselibpqcompat=true&uselibpqcompat=false&sslmode=require`)!).searchParams.get("sslmode"), "verify-full");
  assert.equal(normalizePostgresSslMode(`${base}uselibpqcompat=false&uselibpqcompat=true&sslmode=require`), `${base}uselibpqcompat=false&uselibpqcompat=true&sslmode=require`);
});

test("empty, malformed, and socket connection strings are handled without exposing credentials", () => {
  for (const value of [undefined, null, "", "   "]) assert.equal(normalizePostgresSslMode(value), undefined);
  for (const value of ["/var/run/postgresql", "socket:/var/run/postgresql?db=app", "postgresql://user:secret@", "local_database"]) {
    assert.equal(normalizePostgresSslMode(value), value);
  }
  assert.equal(normalizePostgresSslMode("  postgresql://localhost/app?sslmode=disable  "), "postgresql://localhost/app?sslmode=disable");
});
