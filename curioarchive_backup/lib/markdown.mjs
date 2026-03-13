export function parseFrontmatter(raw) {
  const text = String(raw || '');
  if (!text.startsWith('---\n')) {
    return { data: {}, content: text.trim() };
  }

  const end = text.indexOf('\n---\n', 4);
  if (end === -1) {
    return { data: {}, content: text.trim() };
  }

  const frontmatterBlock = text.slice(4, end);
  const content = text.slice(end + 5).trim();
  const data = {};

  for (const line of frontmatterBlock.split('\n')) {
    if (!line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    data[key] = value;
  }

  return { data, content };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMarkdown(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

export function markdownToHtml(markdown) {
  const lines = String(markdown || '').split('\n');
  const html = [];
  let paragraph = [];
  let listOpen = false;

  function closeParagraph() {
    if (!paragraph.length) return;
    html.push('<p>' + inlineMarkdown(paragraph.join(' ').trim()) + '</p>');
    paragraph = [];
  }

  function closeList() {
    if (!listOpen) return;
    html.push('</ul>');
    listOpen = false;
  }

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      closeParagraph();
      closeList();
      continue;
    }

    if (line.startsWith('### ')) {
      closeParagraph();
      closeList();
      html.push('<h3>' + inlineMarkdown(line.slice(4)) + '</h3>');
      continue;
    }

    if (line.startsWith('## ')) {
      closeParagraph();
      closeList();
      html.push('<h2>' + inlineMarkdown(line.slice(3)) + '</h2>');
      continue;
    }

    if (line.startsWith('# ')) {
      closeParagraph();
      closeList();
      html.push('<h1>' + inlineMarkdown(line.slice(2)) + '</h1>');
      continue;
    }

    if (line.startsWith('- ')) {
      closeParagraph();
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }
      html.push('<li>' + inlineMarkdown(line.slice(2)) + '</li>');
      continue;
    }

    paragraph.push(line);
  }

  closeParagraph();
  closeList();

  return html.join('\n');
}

export function stripMarkdown(markdown) {
  return String(markdown || '')
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^-\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
