import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { compileMarkdownToHtml } from '../react/src/components/markdown/compileMarkdown';

export const VIRTUAL_DOCS_ID = 'virtual:openpeeps-docs';

export type DocEntry = {
  slug: string;
  html: string;
  title: string;
};

const mdLinkPattern = /\]\(([^)]+)\)/g;

const isRelativeDocLink = (href: string): boolean => {
  const trimmed = href.trim();
  return (
    trimmed.length > 0 &&
    !trimmed.startsWith('/') &&
    !trimmed.startsWith('#') &&
    !/^https?:/i.test(trimmed) &&
    !trimmed.startsWith('mailto:')
  );
};

const warnRelativeLinks = (filePath: string, source: string): void => {
  for (const match of source.matchAll(mdLinkPattern)) {
    const href = match[1]?.split('#')[0] ?? '';
    if (isRelativeDocLink(href)) {
      console.warn(
        `[openpeeps-docs] Relative doc link in ${filePath}: (${href}). Use absolute /docs/… paths.`,
      );
    }
  }
};

const extractTitle = (source: string, slug: string): string => {
  const match = source.match(/^#\s+(.+)$/m);
  if (match?.[1]) return match[1].trim();
  if (!slug) return 'Documentation';
  return slug.split('/').pop()?.replace(/-/g, ' ') ?? slug;
};

const fileToSlug = (relativePath: string): string => {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized === 'index.md') return '';
  if (normalized.endsWith('/index.md')) {
    return normalized.slice(0, -'/index.md'.length);
  }
  return normalized.replace(/\.md$/, '');
};

const collectMarkdownFiles = (docsRoot: string): string[] => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) files.push(full);
    }
  };
  walk(docsRoot);
  return files.sort();
};

const buildManifest = (docsRoot: string): DocEntry[] =>
  collectMarkdownFiles(docsRoot).map((filePath) => {
    const relativePath = path.relative(docsRoot, filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    warnRelativeLinks(relativePath, source);
    const slug = fileToSlug(relativePath);
    return {
      slug,
      html: compileMarkdownToHtml(source),
      title: extractTitle(source, slug),
    };
  });

export const openpeepsDocsPlugin = (docsRoot: string): Plugin => {
  let server: ViteDevServer | undefined;

  const loadManifest = (): string => {
    const entries = buildManifest(docsRoot);
    const bySlug = Object.fromEntries(
      entries.map((entry) => [entry.slug, entry]),
    );
    return `export const docsManifest = ${JSON.stringify(entries)};

export const docsBySlug = ${JSON.stringify(bySlug)};
`;
  };

  return {
    name: 'openpeeps-docs',
    configureServer(devServer) {
      server = devServer;
    },
    resolveId(id) {
      if (id === VIRTUAL_DOCS_ID) return `\0${VIRTUAL_DOCS_ID}`;
    },
    load(id) {
      if (id === `\0${VIRTUAL_DOCS_ID}`) return loadManifest();
    },
    handleHotUpdate({ file }) {
      if (file.startsWith(docsRoot) && file.endsWith('.md')) {
        const mod = server?.moduleGraph.getModuleById(`\0${VIRTUAL_DOCS_ID}`);
        if (mod) {
          server?.moduleGraph.invalidateModule(mod);
          server?.ws.send({ type: 'full-reload' });
        }
        return [];
      }
    },
  };
};
