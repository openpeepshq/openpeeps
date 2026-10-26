import { useMemo, useRef, useState } from 'react';
import type { PublicProfile } from '@openpeepshq/common/types';
import { richTextNeedsSourceMode } from '@openpeepshq/common/lib';
import {
  Button,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Textarea,
  cn,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { ProfileCard } from '../../profile';
import {
  RichTextField,
  type RichTextApi,
  type RichTextVariant,
} from './rich-text/RichTextField';

export interface OpenpeepsMarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Character budget; the counter turns red once exceeded. */
  maxLength?: number;
  placeholder?: string;
  rows?: number;
  /**
   * Article: headings, quotes, code, and a divider.
   * Compact: emphasis, lists, links, and mentions.
   */
  variant?: RichTextVariant;
  /** Extra classes for the editor (e.g. taller config editors). */
  className?: string;
  testId?: string;
}

/**
 * Formatted text field that stores Markdown. @-mention search stays, and
 * documents with embeds open in the Markdown source so those tags are kept.
 */
export const OpenpeepsMarkdownInput = ({
  value,
  onChange,
  maxLength = 500,
  placeholder,
  rows = 5,
  variant = 'compact',
  className,
  testId,
}: OpenpeepsMarkdownInputProps) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState(() =>
    richTextNeedsSourceMode(value),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const richTextRef = useRef<RichTextApi | null>(null);

  const profilesQuery = openpeepsApi.useSearchProfiles(query);

  const profiles = useMemo(
    () =>
      (profilesQuery.data?.pages ?? [])
        .flat()
        .map((item) => item.data)
        .slice(0, 6),
    [profilesQuery.data],
  );

  const showMentions = open && query.length >= 1 && profiles.length > 0;

  const handleSourceChange = (next: string) => {
    onChange(next);
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? next.length;
    const before = next.slice(0, cursor);
    const match = before.match(/@([a-zA-Z0-9_-]*)$/);
    if (match) {
      setQuery(match[1] ?? '');
      setOpen(true);
    } else {
      setOpen(false);
      setQuery('');
    }
  };

  const insertMention = (profile: PublicProfile) => {
    if (!sourceMode && richTextRef.current) {
      richTextRef.current.replaceActiveMention(profile.handle);
      setOpen(false);
      setQuery('');
      return;
    }
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const replaced = before.replace(
      /@([a-zA-Z0-9_-]*)$/,
      `@${profile.handle} `,
    );
    onChange(`${replaced}${after}`);
    setOpen(false);
    setQuery('');
  };

  const overLimit = value.length > maxLength;
  const resolvedPlaceholder = placeholder ?? t('posts.form.content');

  return (
    <div className="relative w-full">
      <div className="flex w-full items-center gap-3 pb-2">
        {variant === 'article' ? (
          <Button
            compact
            variant="outline"
            action={() => {
              setSourceMode((current) => !current);
              setOpen(false);
            }}
          >
            {sourceMode
              ? t('form.richText.formatted')
              : t('form.richText.markdownSource')}
          </Button>
        ) : null}
        <a
          href="/docs/user/markdown"
          target="_blank"
          rel="noopener noreferrer"
          className="op-anchor text-sm"
        >
          {t('form.markdownHelp')}
        </a>
      </div>

      <Popover open={showMentions} modal={false}>
        <PopoverAnchor asChild>
          <div ref={anchorRef} className="w-full">
            {sourceMode ? (
              <Textarea
                ref={textareaRef}
                rows={rows}
                value={value}
                maxLength={maxLength}
                placeholder={resolvedPlaceholder}
                onChange={(event) => handleSourceChange(event.target.value)}
                data-testid={testId}
                className={cn('resize-y', className)}
              />
            ) : (
              <RichTextField
                value={value}
                onChange={onChange}
                variant={variant}
                placeholder={resolvedPlaceholder}
                maxLength={maxLength}
                rows={rows}
                className={className}
                testId={testId}
                onMentionQuery={(next) => {
                  if (next === null) {
                    setOpen(false);
                    setQuery('');
                    return;
                  }
                  setQuery(next);
                  setOpen(true);
                }}
                onReady={(api) => {
                  richTextRef.current = api;
                }}
              />
            )}
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => {
            if (anchorRef.current?.contains(event.target as Node)) {
              event.preventDefault();
            }
          }}
          className="bg-surface z-[100] max-h-48 w-[var(--radix-popover-trigger-width)] overflow-y-auto p-0 shadow-md"
        >
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className="hover:bg-surface w-full text-left"
              onMouseDown={(event) => {
                event.preventDefault();
                insertMention(profile);
              }}
            >
              <ProfileCard profile={profile} showAction={false} />
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <div className="w-full px-2 text-right text-sm">
        <span className={overLimit ? 'text-error' : undefined}>
          {value.length}
        </span>{' '}
        / {maxLength}
      </div>
    </div>
  );
};
