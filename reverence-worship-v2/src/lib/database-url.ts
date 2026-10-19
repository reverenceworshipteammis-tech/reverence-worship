/** Keep the driver's existing certificate and hostname verification explicit. */
export function normalizePostgresSslMode(value: string | null | undefined): string | undefined {
  const connectionString = value?.trim();
  if (!connectionString) return undefined;

  try {
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:", "pg:"].includes(url.protocol)) return connectionString;
    // Like node-postgres, use the last value when a parameter is repeated.
    const sslMode = url.searchParams.getAll("sslmode").at(-1);
    const libpqCompatibility = url.searchParams.getAll("uselibpqcompat").at(-1) === "true";
    if (libpqCompatibility || !sslMode || !["prefer", "require", "verify-ca"].includes(sslMode)) return connectionString;

    url.searchParams.set("sslmode", "verify-full");
    return url.toString();
  } catch {
    // Let the database driver handle other connection-string formats. Never
    // surface a URL parsing error that could include database credentials.
    return connectionString;
  }
}
