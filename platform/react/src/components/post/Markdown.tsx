import { useMemo } from 'react';
import { marked } from 'marked';

export interface PostMarkdownProps {
  source?: string;
  className?: string;
}

/**
 * Minimal markdown renderer used by feed posts. Renders trusted, user-authored
 * post content. The Svelte counterpart (`OpenpeepsMarkdown`) also auto-detects
 * URLs and inlines link previews / mentions — we keep this version intentionally
 * small; richer behavior can layer on later.
 */
export function PostMarkdown({ source, className }: PostMarkdownProps) {
  const html = useMemo(
    () => marked.parse(source ?? '', { async: false }) as string,
    [source],
  );
  return (
    <div
      className={
        className ??
        'prose prose-sm max-w-none break-words dark:prose-invert'
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
