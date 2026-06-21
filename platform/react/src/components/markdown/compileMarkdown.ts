import { marked } from 'marked';

export const compileMarkdownToHtml = (source: string): string =>
  marked.parse(source, { async: false }) as string;
