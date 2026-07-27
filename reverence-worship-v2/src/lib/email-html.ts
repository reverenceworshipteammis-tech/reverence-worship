export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ??
      character,
  );
}

export function formatEmailMessage(message: string) {
  return escapeHtml(message).replace(/\r\n?|\n/g, "<br>");
}
