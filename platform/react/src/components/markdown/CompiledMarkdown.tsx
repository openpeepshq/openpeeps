import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import DOMPurify from 'dompurify';
import {
  injectIframeSafetyAttrs,
  MARKDOWN_HTML_ALLOWED_TAGS,
  MARKDOWN_HTML_ALLOWED_ATTRS,
  MARKDOWN_HTML_FORBIDDEN_TAGS,
  MARKDOWN_HTML_FORBIDDEN_ATTRS,
} from '@openpeepshq/common/lib';
import { OPENPEEPS_MARKDOWN_PROSE_CLASS } from './classes';
import { isExternalLink } from './linkTargets';
import { recordOutboundClick } from '../../lib/analyticsClicks';

export interface CompiledMarkdownProps {
  html: string;
  className?: string;
  /** When false, HTML is rendered as-is without sanitization (for trusted sources). */
  sanitize?: boolean;
}

const onMarkdownClick = (event: MouseEvent<HTMLDivElement>) => {
  const anchor = (event.target as HTMLElement | null)?.closest?.('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href) return;
  const origin =
    typeof window !== 'undefined' ? window.location.origin : undefined;
  if (isExternalLink(href, origin)) {
    recordOutboundClick(href, origin);
  }
};

const sanitizeHtml = (html: string): string => {
  let clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...MARKDOWN_HTML_ALLOWED_TAGS],
    ALLOWED_ATTR: [...MARKDOWN_HTML_ALLOWED_ATTRS],
    FORBID_TAGS: [...MARKDOWN_HTML_FORBIDDEN_TAGS],
    FORBID_ATTR: [...MARKDOWN_HTML_FORBIDDEN_ATTRS],
  });
  clean = injectIframeSafetyAttrs(clean);
  return clean;
};

export const CompiledMarkdown = ({
  html,
  className,
  sanitize = true,
}: CompiledMarkdownProps) => {
  const safeHtml = useMemo(
    () => (sanitize ? sanitizeHtml(html) : html),
    [html, sanitize],
  );
  return (
    <div
      className={className ?? OPENPEEPS_MARKDOWN_PROSE_CLASS}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
      onClick={onMarkdownClick}
    />
  );
};
