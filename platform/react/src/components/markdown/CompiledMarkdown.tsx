import type { MouseEvent } from 'react';
import { OPENPEEPS_MARKDOWN_PROSE_CLASS } from './classes';
import { isExternalLink } from './linkTargets';
import { recordOutboundClick } from '../../lib/analyticsClicks';

export interface CompiledMarkdownProps {
  html: string;
  className?: string;
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

export const CompiledMarkdown = ({
  html,
  className,
}: CompiledMarkdownProps) => (
  <div
    className={className ?? OPENPEEPS_MARKDOWN_PROSE_CLASS}
    dangerouslySetInnerHTML={{ __html: html }}
    onClick={onMarkdownClick}
  />
);
