import { useMemo, useRef, useState } from 'react';
import type { PublicProfile } from '@openpeeps/common/types';
import {
  Button,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Textarea,
  cn,
} from '@openpeeps/react-ui';
import { useT } from '../../../i18n';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { OpenpeepsMarkdown } from '../../markdown';
import { ProfileCard } from '../../profile';

export interface OpenpeepsMarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Character budget; the counter turns red once exceeded. */
  maxLength?: number;
  placeholder?: string;
  rows?: number;
  /** Show the preview toggle button (mirrors Svelte `previewButton`). */
  previewButton?: boolean;
  /** Extra classes for the textarea (e.g. taller config editors). */
  className?: string;
  testId?: string;
}

/**
 * Markdown editor mirroring the Svelte `OpenpeepsMarkdownInput`: a textarea
 * with @-mention autocomplete, a preview toggle that renders the markdown over
 * the field, and a character counter.
 */
export function OpenpeepsMarkdownInput({
  value,
  onChange,
  maxLength = 500,
  placeholder,
  rows = 5,
  previewButton = true,
  className,
  testId,
}: OpenpeepsMarkdownInputProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

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

  const handleChange = (next: string) => {
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

  return (
    <div className="relative w-full">
      {showPreview ? (
        <div className="bg-surface-50 border-surface-200 absolute inset-0 z-10 overflow-y-auto rounded-md border p-4 pt-16">
          <Button
            compact
            variant="variant-ringed-surface"
            className="absolute left-2 top-2"
            action={() => setShowPreview(false)}
          >
            {t('form.edit', { defaultValue: 'Back to Editing' })}
          </Button>
          <OpenpeepsMarkdown source={value} linkPreviewMode="none" />
        </div>
      ) : null}

      {previewButton ? (
        <div className="w-full pb-2">
          <Button
            compact
            variant="variant-ringed-surface"
            action={() => setShowPreview(true)}
          >
            {t('form.preview', { defaultValue: 'Preview' })}
          </Button>
        </div>
      ) : null}

      <Popover open={showMentions} modal={false}>
        <PopoverAnchor asChild>
          <div ref={anchorRef} className="w-full">
            <Textarea
              ref={textareaRef}
              rows={rows}
              value={value}
              maxLength={maxLength}
              placeholder={placeholder ?? t('posts.form.content')}
              onChange={(e) => handleChange(e.target.value)}
              data-testid={testId}
              className={cn('resize-y', className)}
            />
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          // Keep the list open while the user keeps typing in the anchored field.
          onPointerDownOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) {
              e.preventDefault();
            }
          }}
          className="bg-card z-[100] max-h-48 w-[var(--radix-popover-trigger-width)] overflow-y-auto p-0 shadow-md"
        >
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className="hover:bg-surface-100 w-full text-left"
              onMouseDown={(e) => {
                e.preventDefault();
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
}
