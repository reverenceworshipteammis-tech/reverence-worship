import { Fragment } from "react";
import { IntercessionRichTextNode, parseIntercessionRichText, richTextStyle } from "@/lib/intercession-rich-text";

function renderNodes(nodes: IntercessionRichTextNode[], keyPrefix: string): React.ReactNode {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === "text") {
      const lines = node.value.split(/\r?\n/);
      return (
        <Fragment key={key}>
          {lines.map((line, lineIndex) => (
            <Fragment key={`${key}-${lineIndex}`}>
              {lineIndex > 0 ? <br /> : null}
              {line}
            </Fragment>
          ))}
        </Fragment>
      );
    }

    const children = renderNodes(node.children, key);
    if (node.type === "span") return <span key={key} style={richTextStyle(node.font, node.size)}>{children}</span>;
    return node.type === "strong" ? <strong key={key}>{children}</strong> : <em key={key}>{children}</em>;
  });
}

export function IntercessionRichText({ value }: { value: string }) {
  return <>{renderNodes(parseIntercessionRichText(value), "rich-text")}</>;
}
