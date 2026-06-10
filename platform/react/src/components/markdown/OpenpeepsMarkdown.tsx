import { useMemo } from 'react';
import { marked } from 'marked';
import { handleRegexBase } from '@openpeeps/common/types';
import { extractUrlsFromText, isEmail } from '../preview-link/helpers';
import { PreviewLink } from '../preview-link/PreviewLink';
import { resolveStaticUrl, useStaticRender } from './staticRender';

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
  // Link previews fetch data via the Openpeeps providers, which aren't present
  // in static renders (notification emails). Suppress them there.
  const { enabled: staticRender, baseUrl } = useStaticRender();
  const effectiveLinkPreviewMode = staticRender ? 'none' : linkPreviewMode;
  const links = useMemo(() => {
    const fromText = extractUrlsFromText(source);
    return fromText
      .map((url) => url.replace(/[),.]+$/, ''))
      .filter((url) => !isEmail(url));
  }, [source]);

  const html = useMemo(() => {
    const processed = preprocessSource(source ?? '', mentions);
    let out = marked.parse(processed, { async: false }) as string;
    if (staticRender && baseUrl) {
      out = out.replace(/href="(\/[^"]*)"/g, (_, path: string) => {
        return `href="${resolveStaticUrl(path, baseUrl)}"`;
      });
    }
    return out;
  }, [source, mentions, staticRender, baseUrl]);

  return (
    <div className="min-w-0 max-w-full">
      {effectiveLinkPreviewMode === 'prepend'
        ? links.map((url) => <PreviewLink key={url} url={url} />)
        : null}
      <div
        className={
          className ??
          (staticRender
            ? 'allpeep-markdown text-sm leading-relaxed break-words text-foreground'
            : "allpeep-markdown prose prose-sm max-w-none break-words dark:prose-invert prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:max-w-full prose-pre:overflow-x-auto")
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {effectiveLinkPreviewMode === 'append'
        ? links.map((url) => <PreviewLink key={url} url={url} />)
        : null}
    </div>
  );
}
