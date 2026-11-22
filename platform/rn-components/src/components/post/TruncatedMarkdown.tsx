import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { truncateMarkdown } from '@openpeepshq/common/lib';
import { useTranslation } from 'react-i18next';
import { TextStyle } from 'react-native';
import { OpenpeepsMarkdown } from '../markdown';
import { MarkdownOverlay } from '../markdown/MarkdownOverlay';
import { useOpenPeepsTheme } from '../../theme/OpenPeepsThemeProvider';
import type { ColorName } from '../../theme/types';

export interface TruncatedMarkdownProps {
  /** Full markdown; rendered in the overlay when `interactive`. */
  source: string;
  /**
   * Pre-truncated excerpt (e.g. `firstNWords`). Computed via
   * `truncateMarkdown` when omitted. When `maxLines` is set, a
   * caller-provided snippet is re-truncated to the same per-line char budget
   * as the computed path, so it cannot exceed the line budget.
   */
  snippet?: string;
  maxBlocks?: number;
  maxChars?: number;
  /** Lines the excerpt is bounded to via a tightened char budget. */
  maxLines?: number;
  /**
   * When true, the excerpt lives in a long-press trigger that opens a
   * `MarkdownOverlay` with the full markdown. When false, only the excerpt
   * renders (callers own their own navigation).
   */
  interactive?: boolean;
  /**
   * Sizing classes (`text-sm`, `text-xs`) map to text metrics and color
   * classes (`text-foreground`, `text-muted-foreground`) to theme tokens,
   * then reach the markdown body via the `baseTextStyle` merge (see
   * `theme.ts`) — accepted so an RN call site can pass the exact string its
   * web twin uses. `break-words` is a no-op on RN (markdown text wraps by
   * default); any other unknown class is ignored.
   */
  className?: string;
}

/** Tailwind text-size classes callers use, mapped to RN text metrics. */
const SIZE_CLASSES: Record<string, TextStyle> = {
  'text-xs': { fontSize: 12, lineHeight: 16 },
  'text-sm': { fontSize: 14, lineHeight: 20 },
};

/** Tailwind text-color classes callers use, mapped to theme color tokens. */
const COLOR_CLASSES: Record<string, ColorName> = {
  'text-foreground': 'foreground',
  'text-muted-foreground': 'muted-foreground',
};

/**
 * Approximate characters per line at the sizes above (short lines bound the
 * budget). Intentionally divergent from the web twin, which line-clamps the
 * rendered lines via CSS: RN cannot line-clamp rendered markdown nodes, so it
 * bounds the excerpt by a char budget instead. The constant is calibrated for
 * `text-sm`; a `text-xs` line fits more than 40 chars, so the `maxLines`
 * budget is conservative at that size (never too long, just shorter).
 */
const CHARS_PER_LINE = 40;

/**
 * RN mirror of the web `TruncatedMarkdown`. `maxLines` and the sizing/color
 * classes are honored here by bounding the excerpt to
 * `maxLines * CHARS_PER_LINE` characters and merging the mapped text metrics
 * and color over the markdown theme (RN cannot line-clamp rendered markdown
 * nodes); the full markdown is revealed via the reusable `MarkdownOverlay`
 * on long-press.
 *
 * Divergences from the web twin, kept in sync by convention (see AGENTS.md
 * mirror rule):
 * - The char-budget clamp above is the RN stand-in for web's CSS line-clamp
 *   (already documented at `CHARS_PER_LINE`).
 * - Web defaults `maxLines` to `2`; RN leaves it `undefined` so an RN
 *   caller that omits it is not silently re-truncated. Every RN caller that
 *   wants a bound passes `maxLines` explicitly; `Article` intentionally
 *   omits it, as does its web twin — if a new caller omits it without a
 *   bound, align the default deliberately.
 * - Web only applies its line-clamp when `interactive`; RN bounds the
 *   excerpt to the `maxLines` char budget in both modes. Callers that keep
 *   `interactive` off (they own their own "show more") still get the bound,
 *   which matches how every current RN caller uses it.
 */
export const TruncatedMarkdown = ({
  source,
  snippet: snippetProp,
  maxBlocks = 2,
  maxChars = 240,
  maxLines,
  interactive = true,
  className,
}: TruncatedMarkdownProps): ReactNode => {
  const { t } = useTranslation();
  const { colors } = useOpenPeepsTheme();
  const classes = (className ?? '').split(/\s+/).filter(Boolean);
  const sizeStyle = classes.map((c) => SIZE_CLASSES[c]).find(Boolean);
  const colorToken = classes.map((c) => COLOR_CLASSES[c]).find(Boolean);
  const baseTextStyle = useMemo(() => {
    const color = colorToken ? colors[colorToken] : undefined;
    if (!sizeStyle && color === undefined) return undefined;
    return { ...sizeStyle, ...(color !== undefined ? { color } : {}) };
  }, [colors, sizeStyle, colorToken]);
  const budget =
    maxLines && maxLines > 0
      ? Math.min(maxChars, maxLines * CHARS_PER_LINE)
      : undefined;
  const excerpt = useMemo(
    () =>
      budget !== undefined
        ? // A caller-provided snippet is pre-truncated, but the maxLines
          // budget must still bound it: re-truncate to the same budget.
          truncateMarkdown(snippetProp ?? source, maxBlocks, budget)
        : (snippetProp ?? truncateMarkdown(source, maxBlocks, maxChars)),
    [snippetProp, source, maxBlocks, maxChars, budget]
  );
  if (!excerpt) return null;

  if (!interactive) {
    return (
      <OpenpeepsMarkdown
        source={excerpt}
        linkPreviewMode="none"
        baseTextStyle={baseTextStyle}
      />
    );
  }

  return (
    <MarkdownOverlay
      source={source}
      // Web-inherited copy: the web twin's `aria-label` uses the same key,
      // whose locale value ("Long press or hover to read the full text") is
      // hint wording, not an exact label — do not "fix" it here without
      // updating the web twin.
      label={t('posts.truncatedMarkdown.showHint', {
        defaultValue: 'Show more',
      })}
    >
      <OpenpeepsMarkdown
        source={excerpt}
        linkPreviewMode="none"
        baseTextStyle={baseTextStyle}
      />
    </MarkdownOverlay>
  );
};
