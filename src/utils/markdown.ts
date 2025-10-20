// src/utils/markdown.ts
// Utilitários mínimos para converter o markdown leve usado no painel
// para HTML seguro, mantendo compatibilidade com o conteúdo existente.

function escapeHtml(source: string): string {
  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function markdownToHtml(source: string): string {
  let output = escapeHtml(source);

  // inline code `code`
  output = output.replace(
    /`([^`]+)`/g,
    (_match, code) =>
      `<code class="px-1 py-0.5 bg-[#151515] border border-[#6c6c6c] rounded-sm">${code}</code>`,
  );

  // bold **text**
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // italic *text*
  output = output.replace(
    /(^|[\s(])\*([^*]+)\*(?=([\s.,;:!?)])|$)/g,
    (_match, before, text) => `${before}<em>${text}</em>`,
  );

  // links [label](https://url)
  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    `<a class="underline underline-offset-2" href="$2" target="_blank" rel="noopener noreferrer">$1</a>`,
  );

  // unordered list markers (- item, • item)
  output = output.replace(/^(?:-|\u2022)\s+(.*)$/gm, "&#8226; $1");

  // new lines
  output = output.replace(/\n/g, "<br/>");

  return output;
}

