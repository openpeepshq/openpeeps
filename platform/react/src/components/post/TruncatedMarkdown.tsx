import { type ReactNode } from 'react';
import { truncateMarkdown } from '@openpeepshq/common/lib';
import { Popover, PopoverContent, PopoverTrigger } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { PostMarkdown } from './Markdown';
import { OPENPEEPS_POST_CAPTION_CLASS } from '../markdown/classes';

export interface TruncatedMarkdownProps {
  /** Full markdown content; rendered in the popover when `interactive`. */
  source: string;
  /** Pre-truncated excerpt. When omitted, computed via `truncateMarkdown`. */
  snippet?: string;
  maxBlocks?: number;
  maxChars?: number;
  /** Lines the excerpt is clamped to (only when `interactive`). */
  maxLines?: number;
  /**
   * When true, the excerpt is clamped and a "Show more" control reveals the
   * full content in a popover (click/tap; hover on desktop via the popover).
   * When false, the excerpt renders as-is — callers that own their own
   * navigation keep it plain.
   */
  interactive?: boolean;
  className?: string;
}

const clampClass = (n: number) => `line-clamp-${n as 1 | 2 | 3 | 4 | 5 | 6}`;

/**
 * Single rendering surface for abbreviated markdown. The excerpt is always
 * produced by the markdown-aware `truncateMarkdown` (links, images and
 * emphasis are never severed), so every abbreviated preview renders as real
 * markdown instead of raw text. Call sites with their own read-more navigation
 * (e.g. Article) keep `interactive` off and render the link themselves.
 */
export const TruncatedMarkdown = ({
  source,
  snippet: snippetProp,
  maxBlocks = 2,
  maxChars = 240,
  maxLines = 2,
  interactive = true,
  className,
}: TruncatedMarkdownProps): ReactNode => {
  const t = useT();
  const excerpt = snippetProp ?? truncateMarkdown(source, maxBlocks, maxChars);
  if (!excerpt) return null;

  const excerptClass = [
    OPENPEEPS_POST_CAPTION_CLASS,
    interactive && maxLines > 0 ? clampClass(maxLines) : '',
    className ?? '',
  ]
    .join(' ')
    .trim();

  const body = <PostMarkdown source={excerpt} className={excerptClass} />;

  if (!interactive) return body;

  return (
    <div className="inline-block max-w-full align-baseline">
      {body}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            aria-label={t('posts.truncatedMarkdown.showHint', {
              defaultValue: 'Show more',
            })}
            className="text-primary inline-flex items-center gap-1 text-xs font-medium underline decoration-transparent underline-offset-2 hover:decoration-inherit"
          >
            {t('posts.truncatedMarkdown.show', { defaultValue: 'Show more' })}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          className="bg-popover text-popover-foreground z-50 max-w-xs rounded-md border p-3 shadow-md"
        >
          <PostMarkdown source={source} />
        </PopoverContent>
      </Popover>
    </div>
  );
};
