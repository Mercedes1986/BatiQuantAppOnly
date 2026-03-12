import React, { useMemo } from "react";

type Props = {
  content: string;
  className?: string;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(md: string): string {
  // ordre important : on part d'un texte déjà "escaped"
  let s = md;

  // `code`
  s = s.replace(/`([^`]+?)`/g, "<code>$1</code>");

  // **bold**
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // *italic* (simple)
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // liens [texte](url) — URL autorisées: http(s) + mailto
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => {
    const u = String(url || "").trim();
    const safe =
      u.startsWith("https://") || u.startsWith("http://") || u.startsWith("mailto:");
    if (!safe) return `${label}`;
    const lbl = String(label || "");
    return `<a href="${u}" target="_blank" rel="noreferrer noopener">${lbl}</a>`;
  });

  return s;
}

export const MarkdownLite: React.FC<Props> = ({ content, className }) => {
  const html = useMemo(() => {
    const raw = content || "";
    const lines = raw.split("\n");

    const out: string[] = [];

    let inUL = false;
    let inOL = false;

    const closeLists = () => {
      if (inUL) {
        out.push("</ul>");
        inUL = false;
      }
      if (inOL) {
        out.push("</ol>");
        inOL = false;
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        closeLists();
        out.push("<div class='h-2'></div>");
        continue;
      }

      // Headings
      if (trimmed.startsWith("### ")) {
        closeLists();
        out.push(`<h3>${renderInline(escapeHtml(trimmed.slice(4)))}</h3>`);
        continue;
      }
      if (trimmed.startsWith("## ")) {
        closeLists();
        out.push(`<h2>${renderInline(escapeHtml(trimmed.slice(3)))}</h2>`);
        continue;
      }
      if (trimmed.startsWith("# ")) {
        closeLists();
        out.push(`<h1>${renderInline(escapeHtml(trimmed.slice(2)))}</h1>`);
        continue;
      }

      // Ordered list: "1. item"
      const isOrdered = /^\d+\.\s+/.test(trimmed);
      if (isOrdered) {
        if (inUL) {
          out.push("</ul>");
          inUL = false;
        }
        if (!inOL) {
          out.push("<ol>");
          inOL = true;
        }
        const item = trimmed.replace(/^\d+\.\s+/, "");
        out.push(`<li>${renderInline(escapeHtml(item))}</li>`);
        continue;
      }

      // Bullet list: "- item" or "* item"
      const isBullet = /^[-*]\s+/.test(trimmed);
      if (isBullet) {
        if (inOL) {
          out.push("</ol>");
          inOL = false;
        }
        if (!inUL) {
          out.push("<ul>");
          inUL = true;
        }
        const item = trimmed.replace(/^[-*]\s+/, "");
        out.push(`<li>${renderInline(escapeHtml(item))}</li>`);
        continue;
      }

      closeLists();
      out.push(`<p>${renderInline(escapeHtml(trimmed))}</p>`);
    }

    closeLists();
    return out.join("\n");
  }, [content]);

  return (
    <div
      className={
        className ||
        "prose prose-slate max-w-none prose-h2:mt-6 prose-h3:mt-4 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:font-semibold prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
