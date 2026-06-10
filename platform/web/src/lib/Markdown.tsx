import { useMemo } from 'react';
import { marked } from 'marked';

export interface MarkdownProps {
  source: string;
  className?: string;
}

/**
 * Inline Markdown renderer. Uses `marked` synchronously to render trusted
 * content (community-authored about/welcome pages, code-of-conduct, etc.).
 *
 * Note: this purposefully does NOT sanitize the output — the source is
 * configured by community admins, mirroring how `OpenpeepsMarkdown` in the
 * Svelte app behaves. If you ever feed untrusted markdown through here,
 * sanitize first.
 */
export function Markdown({ source, className }: MarkdownProps) {
  const html = useMemo(
    () => marked.parse(source ?? '', { async: false }) as string,
    [source],
  );
  return (
    <div
      className={className ?? 'prose prose-sm dark:prose-invert max-w-none'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
