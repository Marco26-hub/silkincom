import { Parser } from 'htmlparser2';

/** Safe URL subset for editorial links. Never render CMS URLs as active code. */
export function editorialHref(value: string): string | null {
  const url = value.trim();
  if (/[\u0000-\u0020\u007f\\]/.test(url)) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    return ['https:', 'http:', 'mailto:'].includes(parsed.protocol) ? url : null;
  } catch {
    return null;
  }
}

// Convert legacy CMS HTML to the journal's small Markdown vocabulary. No HTML
// is injected into React. Block boundaries prevent "wordword" extraction;
// htmlparser2 decodes entities and handles malformed markup consistently.
export function editorialMarkdown(source: string): string {
  let output = '';
  let ignored = 0;
  const links: Array<string | null> = [];
  const blockTags = new Set(['p', 'div', 'section', 'article', 'blockquote', 'ul', 'ol', 'li', 'table', 'tr']);
  const parser = new Parser({
    onopentag(name, attrs) {
      if (['script', 'style', 'iframe', 'object'].includes(name)) { ignored++; return; }
      if (ignored) return;
      if (/^h[1-6]$/.test(name)) output += `\n\n${name === 'h3' || name === 'h4' ? '###' : '##'} `;
      else if (blockTags.has(name)) output += '\n\n';
      else if (name === 'br') output += '\n';
      if (name === 'a') {
        const href = editorialHref(attrs.href ?? '');
        links.push(href);
        if (href) output += '[';
      }
    },
    ontext(text) { if (!ignored) output += text; },
    onclosetag(name) {
      if (['script', 'style', 'iframe', 'object'].includes(name)) { ignored = Math.max(0, ignored - 1); return; }
      if (ignored) return;
      if (name === 'a') {
        const href = links.pop();
        if (href) output += `](${href})`;
      }
      if (blockTags.has(name) || /^h[1-6]$/.test(name)) output += '\n\n';
    },
  }, { decodeEntities: true });
  // Legacy articles linked a route that does not exist; retain the intent.
  parser.write(source.replaceAll('/materiali/cotone', '/materiali#lino-cotone'));
  parser.end();
  return output.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

export function editorialPlainText(source: string): string {
  return editorialMarkdown(source)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ').trim();
}

/** JSON-LD is script data: a CMS string must never close the script element. */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
