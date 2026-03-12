import React, { useMemo } from "react";

type Props = {
  content: string;
  className?: string;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(md: string): string {
  let s = md;
  s = s.replace(/`([^`]+?)`/g, "<code>$1</code>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => {
    const u = String(url || "").trim();
    const safe = u.startsWith("https://") || u.startsWith("http://") || u.startsWith("mailto:");
    if (!safe) return `${label}`;
    return `<a href="${u}" target="_blank" rel="noreferrer noopener">${String(label || "")}</a>`;
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
        out.push("<div class='h-3'></div>");
        continue;
      }

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

      if (/^\d+\.\s+/.test(trimmed)) {
        if (inUL) {
          out.push("</ul>");
          inUL = false;
        }
        if (!inOL) {
          out.push("<ol>");
          inOL = true;
        }
        out.push(`<li>${renderInline(escapeHtml(trimmed.replace(/^\d+\.\s+/, "")))}</li>`);
        continue;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        if (inOL) {
          out.push("</ol>");
          inOL = false;
        }
        if (!inUL) {
          out.push("<ul>");
          inUL = true;
        }
        out.push(`<li>${renderInline(escapeHtml(trimmed.replace(/^[-*]\s+/, "")))}</li>`);
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
        [
          'max-w-none rounded-[24px] border border-white/70 bg-white/74 p-5 backdrop-blur-lg',
          'prose prose-slate prose-p:leading-relaxed prose-p:text-slate-600 prose-h1:text-slate-900',
          'prose-h2:text-slate-900 prose-h2:mt-1 prose-h3:text-slate-800 prose-h3:mt-1',
          'prose-a:text-blue-600 prose-a:font-semibold prose-strong:text-slate-900',
          'prose-code:rounded prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5',
          'prose-ul:my-3 prose-ol:my-3 prose-li:marker:text-slate-400',
          'shadow-[0_16px_44px_rgba(15,23,42,0.06)]',
        ].join(' ')
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
