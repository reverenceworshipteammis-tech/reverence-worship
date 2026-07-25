export type EmailConfiguration = {
  configured: boolean;
  issue: string | null;
  port: number;
  secure: boolean;
  appUrlConfigured: boolean;
  cronSecretConfigured: boolean;
};

type EmailEnvironment = Record<string, string | undefined>;

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

export function getEmailConfiguration(environment: EmailEnvironment = process.env): EmailConfiguration {
  const missing = [
    ["SMTP_HOST", environment.SMTP_HOST],
    ["SMTP_FROM", environment.SMTP_FROM],
  ].filter(([, value]) => !hasValue(value)).map(([name]) => name);

  const hasUser = hasValue(environment.SMTP_USER);
  const hasPassword = hasValue(environment.SMTP_PASSWORD);
  if (hasUser && !hasPassword) missing.push("SMTP_PASSWORD");
  if (hasPassword && !hasUser) missing.push("SMTP_USER");

  const port = Number(environment.SMTP_PORT || 587);
  const invalidPort = !Number.isInteger(port) || port < 1 || port > 65_535;
  const issue = missing.length
    ? `Missing email configuration: ${missing.join(", ")}.`
    : invalidPort
      ? "SMTP_PORT must be a whole number between 1 and 65535."
      : null;

  return {
    configured: issue === null,
    issue,
    port: invalidPort ? 587 : port,
    secure: environment.SMTP_SECURE === "true",
    appUrlConfigured: hasValue(environment.APP_URL) || hasValue(environment.NEXT_PUBLIC_APP_URL),
    cronSecretConfigured: hasValue(environment.CRON_SECRET),
  };
}
