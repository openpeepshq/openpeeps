import { useMemo } from 'react';
import { marked } from 'marked';
import { handleRegexBase } from '@openpeeps/common/types';
import { extractUrlsFromText, isEmail } from '../preview-link/helpers';
import { PreviewLink } from '../preview-link/PreviewLink';

export type MarkdownMention = {
  text?: string;
  profile: { handle: string; displayName?: string | null };
};

export interface OpenpeepsMarkdownProps {
  source?: string;
  mentions?: MarkdownMention[];
  className?: string;
  linkPreviewMode?: 'prepend' | 'append' | 'none';
}

const mentionPattern = new RegExp(
  `(^|[\\s(>])@(${handleRegexBase})(?=\\s|$|[.,!?;:])`,
  'g',
);
const hashtagPattern = /(^|[\s(>])#([a-z0-9_]+)(?=\s|$|[.,!?;:])/gi;

function preprocessSource(
  source: string,
  mentions: MarkdownMention[] = [],
): string {
  let text = source;
  for (const mention of mentions) {
    const handle = mention.profile.handle;
    const pattern = new RegExp(
      `@${handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      'g',
    );
    text = text.replace(pattern, `[@${handle}](/@${handle})`);
  }
  text = text.replace(
    mentionPattern,
    (_, prefix: string, handle: string) =>
      `${prefix}[@${handle}](/@${handle})`,
  );
  text = text.replace(
    hashtagPattern,
    (_, prefix: string, tag: string) =>
      `${prefix}[#${tag}](/tags/${encodeURIComponent(tag)})`,
  );
  return text;
}

export function OpenpeepsMarkdown({
  source,
  mentions = [],
  className,
  linkPreviewMode = 'none',
}: OpenpeepsMarkdownProps) {
  const links = useMemo(() => {
    const fromText = extractUrlsFromText(source);
    return fromText
      .map((url) => url.replace(/[),.]+$/, ''))
      .filter((url) => !isEmail(url));
  }, [source]);

  const html = useMemo(() => {
    const processed = preprocessSource(source ?? '', mentions);
    return marked.parse(processed, { async: false }) as string;
  }, [source, mentions]);

  return (
    <div>
      {linkPreviewMode === 'prepend'
        ? links.map((url) => <PreviewLink key={url} url={url} />)
        : null}
      <div
        className={
          className ??
          'allpeep-markdown prose prose-sm max-w-none break-words dark:prose-invert prose-a:text-primary prose-a:no-underline hover:prose-a:underline'
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {linkPreviewMode === 'append'
        ? links.map((url) => <PreviewLink key={url} url={url} />)
        : null}
    </div>
  );
}
