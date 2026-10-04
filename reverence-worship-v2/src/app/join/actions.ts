"use server";

import { z } from "zod";
import { notifyJoinRequestAdmins } from "@/lib/notifications";

export type JoinRequestState = { error?: string; success?: string };

const requestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  phone: z.string().trim().min(5, "Enter your phone number.").max(40),
  email: z.email("Enter a valid email address.").max(254),
  details: z.string().trim().max(2000).optional().default(""),
});

export async function submitJoinRequest(_previous: JoinRequestState, formData: FormData): Promise<JoinRequestState> {
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };

  const { name, phone, email, details } = parsed.data;
  const message = [
    "A guest would like to join Reverence Worship.",
    "",
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `Details: ${details || "Not provided"}`,
  ].join("\n");

  try {
    const result = await notifyJoinRequestAdmins("New guest wants to join", message);
    if (result.status === "failed" || result.status === "skipped") {
      console.error("Guest join request email was not sent.", result.error);
      return { error: result.error ?? "We couldn't send your request right now. Please try again shortly." };
    }
    if (result.status === "pending") {
      return { success: "Your request was received. The email is queued and will be retried automatically." };
    }
  } catch (error) {
    console.error("Guest join request notification failed.", error);
    return { error: "We couldn't send your request right now. Please try again shortly." };
  }

  return { success: "Thank you for reaching out. Our team has received your request and will be in touch." };
}
