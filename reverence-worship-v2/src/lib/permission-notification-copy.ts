export const PERMISSION_REQUEST_SUBMITTED_MESSAGE = "A new permission request is awaiting review.";

export const PERMISSION_REQUEST_APPROVED_MESSAGE = "Your permission request was approved.";

export function permissionRequestRejectedMessage(reason: string) {
  return `Your permission request was rejected: ${reason}`;
}

export function normalizePermissionRequestNotificationMessage(
  sourceType: string | null,
  title: string,
  message: string,
) {
  if (sourceType !== "permission_request") return message;

  if (title === "Permission request submitted") {
    return PERMISSION_REQUEST_SUBMITTED_MESSAGE;
  }

  if (title === "Permission request approved") {
    return PERMISSION_REQUEST_APPROVED_MESSAGE;
  }

  if (title === "Permission request rejected") {
    const reasonSeparator = message.indexOf(":");
    return reasonSeparator >= 0
      ? `Your permission request was rejected${message.slice(reasonSeparator)}`
      : "Your permission request was rejected.";
  }

  return message;
}
