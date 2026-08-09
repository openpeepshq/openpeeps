#!/usr/bin/env node
/**
 * Build src/generated/docs-manifest.json from prepared docs/ markdown.
 *
 * Env:
 *   DOCS_VERSION_ID, DOCS_VERSION_LABEL
 *   DOCS_CONTENT_DIR (default: docs-site/docs)
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked, Renderer } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const contentDir = process.env.DOCS_CONTENT_DIR
  ? path.resolve(process.env.DOCS_CONTENT_DIR)
  : path.join(SITE_ROOT, 'docs');
const outFile = path.join(SITE_ROOT, 'src/generated/docs-manifest.json');

const versionId = process.env.DOCS_VERSION_ID || 'main';
const versionLabel = process.env.DOCS_VERSION_LABEL || versionId;

const escapeHtml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const compileMarkdownToHtml = (source) => {
  const renderer = new Renderer();
  renderer.link = function ({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    if (!href) return text;
    let out = `<a href="${href}"`;
    if (title) out += ` title="${escapeHtml(title)}"`;
    if (/^https?:/i.test(href)) {
      out += ' target="_blank" rel="noopener noreferrer"';
    }
    out += `>${text}</a>`;
    return out;
  };
  return marked.parse(source, { renderer, async: false });
};

const stripHtml = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const fileToSlug = (relativePath) => {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized === 'index.md') return '';
  if (normalized.endsWith('/index.md')) {
    return normalized.slice(0, -'/index.md'.length);
  }
  return normalized.replace(/\.md$/, '');
};

const extractTitle = (source, slug) => {
  const match = source.match(/^#\s+(.+)$/m);
  if (match?.[1]) return match[1].trim();
  if (!slug) return 'Documentation';
  return slug.split('/').pop()?.replace(/-/g, ' ') ?? slug;
};

const collectMarkdownFiles = (root) => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) files.push(full);
    }
  };
  walk(root);
  return files.sort();
};

if (!existsSync(contentDir)) {
  console.error(`Missing docs content dir: ${contentDir}`);
  process.exit(1);
}

const docs = collectMarkdownFiles(contentDir).map((filePath) => {
  const relativePath = path.relative(contentDir, filePath);
  const source = readFileSync(filePath, 'utf8');
  const slug = fileToSlug(relativePath);
  const html = compileMarkdownToHtml(source);
  return {
    slug,
    title: extractTitle(source, slug),
    html,
    text: stripHtml(html).slice(0, 4000),
  };
});

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  JSON.stringify({ versionId, versionLabel, docs }, null, 2) + '\n',
);
console.error(`wrote ${docs.length} docs → ${outFile} (${versionLabel})`);
