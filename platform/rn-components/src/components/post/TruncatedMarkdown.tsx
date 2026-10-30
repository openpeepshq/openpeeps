import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { truncateMarkdown } from '@openpeepshq/common/lib';
import { useTranslation } from 'react-i18next';
import { OpenpeepsMarkdown } from '../markdown';
import { MarkdownOverlay } from '../markdown/MarkdownOverlay';

export interface TruncatedMarkdownProps {
  /** Full markdown; rendered in the overlay when `interactive`. */
  source: string;
  /** Pre-truncated excerpt (e.g. `firstNWords`). Computed otherwise. */
  snippet?: string;
  maxBlocks?: number;
  maxChars?: number;
  /** Lines the excerpt target (best-effort on RN; excerpt is word/char bounded). */
  maxLines?: number;
  /**
   * When true, the excerpt lives in a long-press trigger that opens a
   * `MarkdownOverlay` with the full markdown. When false, only the excerpt
   * renders (callers own their own navigation).
   */
  interactive?: boolean;
  // Accepted for web parity; RN styling is theme-driven via markdownTheme.
  className?: string;
}

/**
 * RN mirror of the web `TruncatedMarkdown`. Excerpt is word/char-bounded
 * (RN cannot line-clamp rendered markdown nodes); the full markdown is revealed
 * via the reusable `MarkdownOverlay` on long-press.
 */
export const TruncatedMarkdown = ({
  source,
  snippet: snippetProp,
  maxBlocks = 2,
  maxChars = 240,
  interactive = true,
}: TruncatedMarkdownProps): ReactNode => {
  const { t } = useTranslation();
  const excerpt = useMemo(
    () => snippetProp ?? truncateMarkdown(source, maxBlocks, maxChars),
    [snippetProp, source, maxBlocks, maxChars]
  );
  if (!excerpt) return null;

  if (!interactive) {
    return <OpenpeepsMarkdown source={excerpt} linkPreviewMode="none" />;
  }

  return (
    <MarkdownOverlay
      source={source}
      label={t('posts.truncatedMarkdown.showHint', {
        defaultValue: 'Show more',
      })}
    >
      <OpenpeepsMarkdown source={excerpt} linkPreviewMode="none" />
    </MarkdownOverlay>
  );
};
