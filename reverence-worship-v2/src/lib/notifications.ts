import "server-only";

import nodemailer from "nodemailer";
import { getEmailConfiguration } from "@/lib/email-config";
import { escapeHtml, formatEmailMessage } from "@/lib/email-html";
import {
  ACCOUNT_NOTIFICATION_EVENTS,
  DEFAULT_ACCOUNT_EVENT_CHANNELS,
  DEFAULT_ACCOUNT_ROLE_MESSAGE_TEMPLATE,
  DEFAULT_ACCOUNT_STATUS_MESSAGE_TEMPLATE,
  accountNotificationEventChannelSettingKey,
  accountNotificationEventSettingKey,
  NOTIFICATION_CATEGORIES,
  notificationCategory,
  parseNotificationRecipientSettings,
  renderNotificationContent,
  shouldIncludeConfiguredNotificationRecipients,
  type NotificationCategory,
  type AccountNotificationEvent,
  type NotificationContentTemplate,
  type NotificationRecipientSettings,
  type NotificationTemplateVariables,
} from "@/lib/notification-rules";
import { PERMISSION_REQUEST_SUBMITTED_MESSAGE } from "@/lib/permission-notification-copy";
import { prisma } from "@/lib/prisma";

type NotifyUsersInput = {
  userIds: number[];
  type: string;
  title: string;
  message: string;
  link?: string;
  sourceType?: string;
  sourceId?: number;
  dedupeKey?: string;
  emailSubject?: string;
  emailText?: string;
  sendInApp?: boolean;
  sendEmail?: boolean;
  includeConfiguredRecipients?: boolean;
  templateVariables?: Omit<NotificationTemplateVariables, "firstName">;
  templateVariant?: "account_status" | "account_role";
  event?: AccountNotificationEvent;
};

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

export type EmailDeliveryResult = {
  status: "sent" | "pending" | "failed" | "skipped";
  error: string | null;
};

type NotificationSettings = {
  enabledTypes: Set<string>;
  channels: Map<NotificationCategory | "birthday", { inAppEnabled: boolean; emailEnabled: boolean }>;
  configuredRecipients: Map<NotificationCategory, NotificationRecipientSettings>;
  templates: Map<NotificationCategory, NotificationContentTemplate>;
  accountStatusMessageTemplate: string;
  accountRoleMessageTemplate: string;
  accountEventEnabled: Map<AccountNotificationEvent, boolean>;
  accountEventChannels: Map<AccountNotificationEvent, { inAppEnabled: boolean; emailEnabled: boolean }>;
};

function uniqueIds(ids: number[]) {
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
}

function settingToBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "1" || value === "true";
  if (typeof value === "number") return value === 1;
  return fallback;
}

async function getNotificationSettings(): Promise<NotificationSettings> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { startsWith: "notification_" } },
    select: { key: true, value: true },
  });
  const settings = new Map(rows.map((row) => [row.key, row.value]));

  const enabledTypes = new Set<string>();
  for (const type of NOTIFICATION_CATEGORIES) {
    if (settingToBoolean(settings.get(`notification_${type}_enabled`), true)) enabledTypes.add(type);
  }
  if (settingToBoolean(settings.get("notification_birthday_enabled"), true)) enabledTypes.add("birthday");

  const channelTypes: Array<NotificationCategory | "birthday"> = [...NOTIFICATION_CATEGORIES, "birthday"];

  return {
    enabledTypes,
    channels: new Map(channelTypes.map((type) => [
      type,
      {
        inAppEnabled: settingToBoolean(
          settings.get(`notification_${type}_in_app_enabled`),
          settingToBoolean(settings.get("notification_in_app_enabled"), true),
        ),
        emailEnabled: settingToBoolean(
          settings.get(`notification_${type}_email_enabled`),
          settingToBoolean(settings.get("notification_email_enabled"), true),
        ),
      },
    ] as const)),
    configuredRecipients: new Map(NOTIFICATION_CATEGORIES.map((type) => {
      const value = settings.get(`notification_${type}_recipients`);
      return [type, parseNotificationRecipientSettings(value)];
    })),
    templates: new Map(NOTIFICATION_CATEGORIES.map((type) => [
      type,
      {
        title: type !== "account" && typeof settings.get(`notification_${type}_title_template`) === "string"
          ? settings.get(`notification_${type}_title_template`) as string
          : "",
        message: type !== "account" && typeof settings.get(`notification_${type}_message_template`) === "string"
          ? settings.get(`notification_${type}_message_template`) as string
          : "",
      },
    ])),
    accountStatusMessageTemplate: typeof settings.get("notification_account_status_message_template") === "string"
      ? settings.get("notification_account_status_message_template") as string
      : DEFAULT_ACCOUNT_STATUS_MESSAGE_TEMPLATE,
    accountRoleMessageTemplate: typeof settings.get("notification_account_role_message_template") === "string"
      ? settings.get("notification_account_role_message_template") as string
      : DEFAULT_ACCOUNT_ROLE_MESSAGE_TEMPLATE,
    accountEventEnabled: new Map(ACCOUNT_NOTIFICATION_EVENTS.map(({ id }) => [
      id,
      settingToBoolean(settings.get(accountNotificationEventSettingKey(id)), true),
    ])),
    accountEventChannels: new Map(ACCOUNT_NOTIFICATION_EVENTS.map(({ id }) => [
      id,
      {
        inAppEnabled: settingToBoolean(
          settings.get(accountNotificationEventChannelSettingKey(id, "inAppEnabled")),
          DEFAULT_ACCOUNT_EVENT_CHANNELS[id].inAppEnabled,
        ),
        emailEnabled: settingToBoolean(
          settings.get(accountNotificationEventChannelSettingKey(id, "emailEnabled")),
          DEFAULT_ACCOUNT_EVENT_CHANNELS[id].emailEnabled,
        ),
      },
    ])),
  };
}

async function resolveNotificationRecipientIds(recipients: NotificationRecipientSettings) {
  if (recipients.mode === "all") {
    const users = await prisma.user.findMany({ where: { status: "active" }, select: { id: true } });
    return users.map((user) => user.id);
  }
  if (recipients.mode === "roles") {
    if (!recipients.roleIds.length) return [];
    const users = await prisma.user.findMany({
      where: { status: "active", roles: { some: { roleId: { in: recipients.roleIds } } } },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }
  if (!recipients.userIds.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: recipients.userIds }, status: "active" },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

function mailTransport() {
  if (transporter) return transporter;
  const configuration = getEmailConfiguration();
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: configuration.port,
    secure: configuration.secure,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
  return transporter;
}

function emailHtml(title: string, message: string, link?: string) {
  const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const actionUrl = link && appUrl ? `${appUrl}${link}` : null;
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#1f2937"><h2 style="color:#1d4ed8">${escapeHtml(title)}</h2><p style="line-height:1.6">${formatEmailMessage(message)}</p>${actionUrl ? `<p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:10px 16px;border-radius:8px">Open Reverence Worship</a></p>` : ""}<p style="font-size:12px;color:#6b7280">Reverence Worship Team.</p></div>`;
}

export async function deliverEmail(deliveryId: number) {
  const delivery = await prisma.emailDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) return { status: "skipped", error: "Email delivery was not found." } satisfies EmailDeliveryResult;
  if (delivery.status === "sent") return { status: "sent", error: null } satisfies EmailDeliveryResult;

  const configuration = getEmailConfiguration();
  if (!configuration.configured) {
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "pending", lastError: configuration.issue, nextAttemptAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    return { status: "pending", error: configuration.issue } satisfies EmailDeliveryResult;
  }

  try {
    await mailTransport().sendMail({
      from: process.env.SMTP_FROM,
      to: delivery.recipient,
      subject: delivery.subject,
      text: delivery.text,
      html: delivery.html ?? undefined,
    });
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "sent", attempts: { increment: 1 }, sentAt: new Date(), lastError: null, nextAttemptAt: null },
    });
    return { status: "sent", error: null } satisfies EmailDeliveryResult;
  } catch (error) {
    const attempts = delivery.attempts + 1;
    const message = error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000);
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: attempts >= 3 ? "failed" : "pending",
        attempts,
        lastError: message,
        nextAttemptAt: attempts >= 3 ? null : new Date(Date.now() + attempts * 15 * 60 * 1000),
      },
    });
    return { status: attempts >= 3 ? "failed" : "pending", error: message } satisfies EmailDeliveryResult;
  }
}

export async function notifyUsers(input: NotifyUsersInput) {
  const settings = await getNotificationSettings();
  const category = notificationCategory(input.type);
  const enabledType = input.type === "birthday" ? "birthday" : category;
  if (!settings.enabledTypes.has(enabledType)) return [];
  if (category === "account" && input.event && !settings.accountEventEnabled.get(input.event)) return [];
  const channels = category === "account" && input.event
    ? settings.accountEventChannels.get(input.event)
    : settings.channels.get(input.type === "birthday" ? "birthday" : category);
  const effectiveChannels = channels
    ?? { inAppEnabled: true, emailEnabled: true };
  const configuredIds = shouldIncludeConfiguredNotificationRecipients(category, Boolean(input.includeConfiguredRecipients))
    ? await resolveNotificationRecipientIds(settings.configuredRecipients.get(category) ?? { mode: "individuals", userIds: [], roleIds: [] })
    : [];
  const ids = uniqueIds([...input.userIds, ...configuredIds]);
  if (!ids.length) return [];

  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, name: true } });
  const notificationIds: number[] = [];
  const categoryTemplate = input.type === "birthday"
    ? { title: "", message: "" }
    : settings.templates.get(category) ?? { title: "", message: "" };
  const template = input.templateVariant === "account_status"
    ? { ...categoryTemplate, message: settings.accountStatusMessageTemplate }
    : input.templateVariant === "account_role"
      ? { ...categoryTemplate, message: settings.accountRoleMessageTemplate }
      : categoryTemplate;

  for (const user of users) {
    const firstName = user.name.trim().split(/\s+/)[0] ?? "";
    const templateVariables = { ...input.templateVariables, firstName };
    const { title, message } = renderNotificationContent(
      input.title,
      input.message,
      template,
      templateVariables,
    );
    const dedupeKey = input.dedupeKey ? `${input.dedupeKey}:user:${user.id}` : null;
    let notification: { id: number } | null = null;

    if (effectiveChannels.inAppEnabled && input.sendInApp !== false) {
      const data = {
        userId: user.id,
        type: input.type,
        title,
        message,
        link: input.link,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        dedupeKey,
      };
      notification = dedupeKey
        ? await prisma.notification.upsert({
            where: { dedupeKey },
            update: {},
            create: data,
          })
        : await prisma.notification.create({ data });
      notificationIds.push(notification.id);
    }

    if (effectiveChannels.emailEnabled && input.sendEmail !== false && user.email) {
      const emailContent = renderNotificationContent(
        input.emailSubject ?? input.title,
        input.emailText ?? input.message,
        template,
        templateVariables,
      );
      const data = {
        userId: user.id,
        notificationId: notification?.id,
        recipient: user.email,
        subject: emailContent.title,
        text: emailContent.message,
        html: emailHtml(emailContent.title, emailContent.message, input.link),
      };
      const delivery = notification
        ? await prisma.emailDelivery.upsert({
            where: { notificationId: notification.id },
            update: {},
            create: data,
          })
        : await prisma.emailDelivery.create({ data });
      if (delivery.status === "pending") await deliverEmail(delivery.id);
    }
  }

  return notificationIds;
}

export async function notifyEmailAddress(
  recipient: string,
  subject: string,
  message: string,
  category?: NotificationCategory,
  event?: AccountNotificationEvent,
) {
  if (!recipient) return { status: "skipped", error: "Recipient email is required." } satisfies EmailDeliveryResult;
  const settings = await getNotificationSettings();
  const emailEnabled = category === "account" && event
    ? settings.accountEventChannels.get(event)?.emailEnabled
    : category ? settings.channels.get(category)?.emailEnabled : true;
  if (category && (!settings.enabledTypes.has(category) || !emailEnabled)) {
    return { status: "skipped", error: `${category.replaceAll("_", " ")} email notifications are disabled in System Settings.` } satisfies EmailDeliveryResult;
  }
  if (category === "account" && event && !settings.accountEventEnabled.get(event)) {
    return { status: "skipped", error: "Account registration notifications are disabled in System Settings." } satisfies EmailDeliveryResult;
  }
  const delivery = await prisma.emailDelivery.create({
    data: { recipient, subject, text: message, html: emailHtml(subject, message) },
  });
  return deliverEmail(delivery.id);
}

export async function sendCriticalSystemEmail(subject: string, message: string) {
  const settings = await getNotificationSettings();
  if (!settings.channels.get("system")?.emailEnabled || !settings.enabledTypes.has("system")) return false;
  const configuredIds = await resolveNotificationRecipientIds(settings.configuredRecipients.get("system") ?? { mode: "individuals", userIds: [], roleIds: [] });
  const configuredUsers = configuredIds.length
    ? await prisma.user.findMany({ where: { id: { in: configuredIds }, status: "active" }, select: { email: true } })
    : [];
  const recipients = [...new Set([
    ...(process.env.SYSTEM_ALERT_EMAIL ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    ...configuredUsers.map((user) => user.email),
  ])];
  if (!recipients.length || !getEmailConfiguration().configured) return false;
  const content = renderNotificationContent(subject, message, settings.templates.get("system") ?? { title: "", message: "" });
  await mailTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: recipients,
    subject: content.title,
    text: content.message,
    html: emailHtml(content.title, content.message),
  });
  return true;
}

export async function userIdsForRoles(roleNames: string[]) {
  const users = await prisma.user.findMany({
    where: { status: "active", roles: { some: { role: { name: { in: roleNames } } } } },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

export async function userIdsWithPermission(pageName: string, featureName: string) {
  const users = await prisma.user.findMany({
    where: {
      status: "active",
      roles: {
        some: {
          role: {
            permissions: { some: { page: { name: pageName }, feature: { name: featureName } } },
          },
        },
      },
    },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

export async function userIdsForAnnouncement(targetType: string, targetRoles: string | null, targetUsers: string | null) {
  if (targetType === "users" || targetType === "filters") {
    try {
      const userIds = uniqueIds((JSON.parse(targetUsers ?? "[]") as unknown[]).map(Number));
      if (!userIds.length) return [];
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          ...(targetType === "users" ? { status: "active" as const } : {}),
        },
        select: { id: true },
      });
      return users.map((user) => user.id);
    } catch {
      return [];
    }
  }

  if (targetType === "roles") {
    try {
      const roleIds = uniqueIds((JSON.parse(targetRoles ?? "[]") as unknown[]).map(Number));
      if (!roleIds.length) return [];
      const users = await prisma.user.findMany({
        where: { status: "active", roles: { some: { roleId: { in: roleIds } } } },
        select: { id: true },
      });
      return users.map((user) => user.id);
    } catch {
      return [];
    }
  }

  const users = await prisma.user.findMany({ where: { status: "active" }, select: { id: true } });
  return users.map((user) => user.id);
}

export async function notifySuperAdmins(input: Omit<NotifyUsersInput, "userIds">) {
  return notifyUsers({
    ...input,
    userIds: await userIdsForRoles(["super-admin"]),
    includeConfiguredRecipients: true,
  });
}

export async function notifyJoinRequestAdmins(title: string, message: string) {
  const settings = await getNotificationSettings();
  if (!settings.channels.get("join_request")?.emailEnabled) {
    return { status: "skipped", error: "Email notifications are disabled in System Settings." } satisfies EmailDeliveryResult;
  }
  if (!settings.enabledTypes.has("join_request")) {
    return { status: "skipped", error: "Join request notifications are disabled in System Settings." } satisfies EmailDeliveryResult;
  }

  const configuredIds = await resolveNotificationRecipientIds(
    settings.configuredRecipients.get("join_request") ?? { mode: "individuals", userIds: [], roleIds: [] },
  );
  const users = await prisma.user.findMany({
    where: {
      status: "active",
      OR: [
        { roles: { some: { role: { name: { in: ["admin", "super-admin"] } } } } },
        ...(configuredIds.length ? [{ id: { in: configuredIds } }] : []),
      ],
    },
    select: { id: true, email: true },
  });
  const recipients = [...new Set(users.map((user) => user.email).filter(Boolean))];
  if (!recipients.length) {
    return { status: "skipped", error: "No active admin accounts have an email address." } satisfies EmailDeliveryResult;
  }

  await notifyUsers({
    userIds: users.map((user) => user.id),
    type: "join_request",
    title,
    message,
    sendEmail: false,
    sendInApp: true,
    includeConfiguredRecipients: true,
    dedupeKey: `join-request:${crypto.randomUUID()}`,
  });

  const content = renderNotificationContent(
    title,
    message,
    settings.templates.get("join_request") ?? { title: "", message: "" },
  );
  const emailSubject = settings.templates.get("join_request")?.title.trim() ? content.title : "A guest wants to join Reverence Worship";
  const results = await Promise.all(recipients.map((recipient) =>
    notifyEmailAddress(recipient, emailSubject, content.message),
  ));
  const failure = results.find((result) => result.status === "failed" || result.status === "skipped");
  if (failure) return failure;
  return results.some((result) => result.status === "pending")
    ? { status: "pending", error: null } satisfies EmailDeliveryResult
    : { status: "sent", error: null } satisfies EmailDeliveryResult;
}

export async function reconcilePendingPermissionNotifications(limit = 100) {
  const [requests, approverIds] = await Promise.all([
    prisma.permissionRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true },
    }),
    userIdsWithPermission("discipline", "approve-permission-requests"),
  ]);

  for (const request of requests) {
    await notifyUsers({
      userIds: approverIds,
      type: "permission",
      title: "Permission request submitted",
      message: PERMISSION_REQUEST_SUBMITTED_MESSAGE,
      link: "/admin/discipline?tab=permission&status=pending",
      sourceType: "permission_request",
      sourceId: request.id,
      dedupeKey: `permission:${request.id}:submitted`,
      includeConfiguredRecipients: true,
    });
  }

  return { requests: requests.length, approvers: approverIds.length };
}

export async function verifyEmailTransport() {
  const configuration = getEmailConfiguration();
  if (!configuration.configured) return { ok: false, message: configuration.issue ?? "SMTP is not configured." };
  try {
    await mailTransport().verify();
    return { ok: true, message: "SMTP connection and authentication succeeded." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function processPendingEmailDeliveries(limit = 50, includeScheduled = false) {
  const deliveries = await prisma.emailDelivery.findMany({
    where: {
      status: "pending",
      ...(includeScheduled ? {} : { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] }),
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  for (const delivery of deliveries) await deliverEmail(delivery.id);
  return deliveries.length;
}
