export type IntercessionRichTextNode =
  | { type: "text"; value: string }
  | { type: "strong" | "em"; children: IntercessionRichTextNode[] };

const tagPattern = /<\/?(?:strong|em)>/gi;

function decodeEntity(entity: string) {
  const normalized = entity.toLowerCase();
  if (normalized === "&amp;") return "&";
  if (normalized === "&lt;") return "<";
  if (normalized === "&gt;") return ">";
  if (normalized === "&quot;") return '"';
  if (normalized === "&#39;" || normalized === "&apos;") return "'";

  const decimal = normalized.match(/^&#(\d+);$/);
  const hexadecimal = normalized.match(/^&#x([0-9a-f]+);$/);
  const codePoint = decimal ? Number(decimal[1]) : hexadecimal ? Number.parseInt(hexadecimal[1], 16) : Number.NaN;
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return entity;

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return entity;
  }
}

export function decodeIntercessionRichTextEntities(value: string) {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#39|#\d+|#x[0-9a-f]+);/gi, decodeEntity);
}

export function escapeIntercessionRichText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function parseIntercessionRichText(value: string): IntercessionRichTextNode[] {
  const root: IntercessionRichTextNode[] = [];
  const stack: Array<{ type: "root" | "strong" | "em"; children: IntercessionRichTextNode[] }> = [
    { type: "root", children: root },
  ];
  let cursor = 0;

  for (const match of value.matchAll(tagPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      stack.at(-1)!.children.push({ type: "text", value: decodeIntercessionRichTextEntities(value.slice(cursor, index)) });
    }

    const tag = match[0].toLowerCase();
    const type = tag.includes("strong") ? "strong" : "em";
    if (!tag.startsWith("</")) {
      const node: IntercessionRichTextNode = { type, children: [] };
      stack.at(-1)!.children.push(node);
      stack.push(node);
    } else if (stack.at(-1)?.type === type) {
      stack.pop();
    } else {
      stack.at(-1)!.children.push({ type: "text", value: match[0] });
    }
    cursor = index + match[0].length;
  }

  if (cursor < value.length) {
    stack.at(-1)!.children.push({ type: "text", value: decodeIntercessionRichTextEntities(value.slice(cursor)) });
  }

  return root;
}

function nodesToPlainText(nodes: IntercessionRichTextNode[]): string {
  return nodes.map((node) => node.type === "text" ? node.value : nodesToPlainText(node.children)).join("");
}

export function intercessionRichTextToPlainText(value: string) {
  return nodesToPlainText(parseIntercessionRichText(value));
}

function nodesToSafeHtml(nodes: IntercessionRichTextNode[]): string {
  return nodes.map((node) => {
    if (node.type === "text") return escapeIntercessionRichText(node.value).replace(/\r?\n/g, "<br>");
    return `<${node.type}>${nodesToSafeHtml(node.children)}</${node.type}>`;
  }).join("");
}

export function intercessionRichTextToSafeHtml(value: string) {
  return nodesToSafeHtml(parseIntercessionRichText(value));
}
