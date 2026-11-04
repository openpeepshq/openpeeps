import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  View,
  type NativeSyntheticEvent,
  type TextInput,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import type { PublicProfile } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { OpenpeepsMarkdown } from '../../markdown/index';
import { ProfileAvatar } from '../../profile/Avatar';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { ThemedText } from '../../ui/themed-text';
import { toAbsoluteMediaUrl } from '../../../lib/media-url';
import { cn, maxContentLength } from '../../../lib/utils';

export interface OpenpeepsMarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Character budget; the counter turns red once exceeded. */
  maxLength?: number;
  placeholder?: string;
  rows?: number;
  /** Show the preview toggle button (mirrors web `previewButton`). */
  previewButton?: boolean;
  /** Extra classes for the textarea. */
  className?: string;
  testId?: string;
  autoFocus?: boolean;
  /**
   * Formatting buttons for long-form markdown. React Native has no
   * content-editable surface that round-trips this markdown, so the buttons
   * insert the same syntax the web visual editor writes.
   */
  formattingToolbar?: boolean;
}

type TextSelection = { start: number; end: number };

type MarkdownFormat =
  | 'bold'
  | 'italic'
  | 'heading'
  | 'list'
  | 'quote'
  | 'link'
  | 'code';

const LINE_PREFIX: Partial<Record<MarkdownFormat, string>> = {
  heading: '## ',
  list: '- ',
  quote: '> ',
};

const WRAP: Partial<Record<MarkdownFormat, [string, string]>> = {
  bold: ['**', '**'],
  italic: ['*', '*'],
  code: ['`', '`'],
};

const applyMarkdownFormat = (
  value: string,
  selection: TextSelection,
  kind: MarkdownFormat,
  linkLabel: string
): { value: string; selection: TextSelection } => {
  const from = Math.max(
    0,
    Math.min(selection.start, selection.end, value.length)
  );
  const to = Math.min(
    value.length,
    Math.max(selection.start, selection.end, 0)
  );
  const selected = value.slice(from, to);
  const prefix = LINE_PREFIX[kind];
  if (prefix) {
    const lineStart = from === 0 ? 0 : value.lastIndexOf('\n', from - 1) + 1;
    if (value.slice(lineStart).startsWith(prefix)) {
      return { value, selection: { start: from, end: to } };
    }
    const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
    return {
      value: next,
      selection: { start: from + prefix.length, end: to + prefix.length },
    };
  }
  if (kind === 'link') {
    const isUrl = /^https?:\/\//.test(selected);
    const label = selected && !isUrl ? selected : linkLabel;
    const href = isUrl ? selected : 'https://';
    const insertion = `[${label}](${href})`;
    const next = `${value.slice(0, from)}${insertion}${value.slice(to)}`;
    const cursor = from + insertion.length;
    return { value: next, selection: { start: cursor, end: cursor } };
  }
  const [open, close] = WRAP[kind] ?? ['', ''];
  const insertion = `${open}${selected}${close}`;
  const next = `${value.slice(0, from)}${insertion}${value.slice(to)}`;
  const cursor = selected ? from + insertion.length : from + open.length;
  return { value: next, selection: { start: cursor, end: cursor } };
};

const mentionQueryFrom = (text: string, cursor: number) => {
  const match = text.slice(0, cursor).match(/@([a-zA-Z0-9_-]*)$/);
  return match ? (match[1] ?? '') : null;
};

/**
 * Markdown editor mirroring the web `OpenpeepsMarkdownInput`: a textarea
 * with @-mention autocomplete, a preview toggle that renders the markdown,
 * and a character counter.
 */
export const OpenpeepsMarkdownInput = ({
  value,
  onChange,
  maxLength = maxContentLength,
  placeholder,
  rows = 5,
  previewButton = true,
  className,
  testId,
  autoFocus = false,
  formattingToolbar = false,
}: OpenpeepsMarkdownInputProps) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const valueRef = useRef(value);

  // Preview is local state. Clearing the text after send has to leave an
  // editable field, not the preview pane.
  useLayoutEffect(() => {
    if (value.length === 0) setShowPreview(false);
  }, [value]);

  const cursorRef = useRef(value.length);
  const selectionRef = useRef<TextSelection>({
    start: value.length,
    end: value.length,
  });
  const inputRef = useRef<TextInput>(null);
  const [forcedSelection, setForcedSelection] = useState<
    TextSelection | undefined
  >(undefined);

  valueRef.current = value;

  const profilesQuery = openpeepsApi.useSearchProfiles(query);

  const profiles = useMemo(
    () =>
      (profilesQuery.data?.pages ?? [])
        .flat()
        .map((item) => item.data)
        .slice(0, 6),
    [profilesQuery.data]
  );

  const showMentions = open && query.length >= 1 && profiles.length > 0;

  const updateMentionState = (text: string, cursor: number) => {
    const mentionQuery = mentionQueryFrom(text, cursor);
    if (mentionQuery !== null) {
      setQuery(mentionQuery);
      setOpen(true);
    } else {
      setOpen(false);
      setQuery('');
    }
  };

  const handleChange = (next: string) => {
    onChange(next);
    valueRef.current = next;
    const cursor = Math.min(
      next.length,
      Math.max(0, cursorRef.current + (next.length - value.length))
    );
    cursorRef.current = cursor;
    updateMentionState(next, cursor);
  };

  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>
  ) => {
    const nextSelection = event.nativeEvent.selection;
    cursorRef.current = nextSelection.start;
    selectionRef.current = nextSelection;
    updateMentionState(valueRef.current, nextSelection.start);
  };

  const applyFormat = (kind: MarkdownFormat) => {
    const linkLabel = t('form.richMarkdown.linkText', {
      defaultValue: 'link',
    });
    const result = applyMarkdownFormat(
      valueRef.current,
      selectionRef.current,
      kind,
      linkLabel
    );
    if (result.value.length > maxLength) return;
    onChange(result.value);
    valueRef.current = result.value;
    selectionRef.current = result.selection;
    cursorRef.current = result.selection.start;
    setForcedSelection(result.selection);
    requestAnimationFrame(() => setForcedSelection(undefined));
    inputRef.current?.focus();
  };

  const insertMention = (profile: PublicProfile) => {
    const cursor = cursorRef.current;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const replaced = before.replace(
      /@([a-zA-Z0-9_-]*)$/,
      `@${profile.handle} `
    );
    onChange(`${replaced}${after}`);
    setOpen(false);
    setQuery('');
  };

  const openMarkdownHelp = () => {
    const url = toAbsoluteMediaUrl('/docs/user/markdown');
    if (url) {
      void Linking.openURL(url);
    }
  };

  const overLimit = value.length > maxLength;

  return (
    <View className="relative w-full">
      {showPreview ? (
        <View className="min-h-[80px] rounded-md border border-border bg-background p-3">
          <Button
            size="sm"
            variant="outline"
            className="mb-3 self-start"
            onPress={() => setShowPreview(false)}
          >
            <ThemedText>
              {t('form.edit', { defaultValue: 'Back to Editing' })}
            </ThemedText>
          </Button>
          <OpenpeepsMarkdown source={value} linkPreviewMode="none" />
        </View>
      ) : (
        <>
          <View className="flex-row items-center gap-3 pb-2">
            {previewButton ? (
              <Button
                size="sm"
                variant="outline"
                onPress={() => setShowPreview(true)}
              >
                <ThemedText>
                  {t('form.preview', { defaultValue: 'Preview' })}
                </ThemedText>
              </Button>
            ) : null}
            <Pressable onPress={openMarkdownHelp} accessibilityRole="link">
              <ThemedText className="text-sm text-primary">
                {t('form.markdownHelp', { defaultValue: 'Formatting help' })}
              </ThemedText>
            </Pressable>
          </View>

          {formattingToolbar ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-2"
            >
              <View className="flex-row gap-1">
                {(
                  [
                    ['bold', 'B', 'form.richMarkdown.toolbar.bold', 'Bold'],
                    [
                      'italic',
                      'I',
                      'form.richMarkdown.toolbar.italic',
                      'Italic',
                    ],
                    [
                      'heading',
                      'H',
                      'form.richMarkdown.toolbar.blockTypes.heading',
                      'Heading',
                    ],
                    [
                      'list',
                      '•',
                      'form.richMarkdown.toolbar.bulletedList',
                      'Bulleted list',
                    ],
                    [
                      'quote',
                      '❝',
                      'form.richMarkdown.toolbar.blockTypes.quote',
                      'Quote',
                    ],
                    ['link', '↗', 'form.richMarkdown.toolbar.link', 'Link'],
                    [
                      'code',
                      '</>',
                      'form.richMarkdown.toolbar.inlineCode',
                      'Code',
                    ],
                  ] as const
                ).map(([kind, glyph, key, fallback]) => (
                  <Pressable
                    key={kind}
                    accessibilityRole="button"
                    accessibilityLabel={t(key, {
                      defaultValue: fallback,
                      level: 2,
                    })}
                    onPress={() => applyFormat(kind)}
                    className="h-9 min-w-9 items-center justify-center rounded-md border border-border bg-background px-2"
                  >
                    <ThemedText
                      className={cn(
                        'text-sm',
                        kind === 'bold' && 'font-bold',
                        kind === 'italic' && 'italic'
                      )}
                    >
                      {glyph}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : null}

          {showMentions ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              className="mb-2 max-h-48 rounded-md border border-border bg-surface"
              nestedScrollEnabled
            >
              {profiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  className="flex-row items-center gap-x-2 px-3 py-2"
                  onPress={() => insertMention(profile)}
                >
                  <ProfileAvatar profile={profile} className="size-8" />
                  <View>
                    <ThemedText className="font-semibold">
                      {profile.displayName || profile.handle}
                    </ThemedText>
                    <ThemedText className="text-sm text-muted-foreground">
                      @{profile.handle}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <Textarea
            ref={inputRef}
            autoFocus={autoFocus}
            numberOfLines={rows}
            value={value}
            maxLength={maxLength}
            placeholder={placeholder ?? t('posts.form.content')}
            onChangeText={handleChange}
            onSelectionChange={handleSelectionChange}
            testID={testId}
            className={cn('min-h-[80px]', className)}
            {...(forcedSelection ? { selection: forcedSelection } : {})}
          />
        </>
      )}

      <View className="w-full px-2 pt-1">
        <ThemedText
          className={cn('text-right text-sm', overLimit && 'text-destructive')}
        >
          {value.length} / {maxLength}
        </ThemedText>
      </View>
    </View>
  );
};

export const OpenpeepsRichMarkdownInput = (
  props: OpenpeepsMarkdownInputProps
) => <OpenpeepsMarkdownInput {...props} formattingToolbar />;

/** Posts and messages keep the textarea and can show the formatting bar. */
export const OpenpeepsComposerInput = (props: OpenpeepsMarkdownInputProps) => {
  const { t } = useTranslation();
  const [rich, setRich] = useState(false);
  return (
    <View className="w-full">
      <View className="mb-2 flex-row gap-2">
        <Button
          size="sm"
          variant={rich ? 'outline' : 'default'}
          accessibilityState={{ selected: !rich }}
          onPress={() => setRich(false)}
        >
          <ThemedText>
            {t('form.composerMode.markdown', { defaultValue: 'Markdown' })}
          </ThemedText>
        </Button>
        <Button
          size="sm"
          variant={rich ? 'default' : 'outline'}
          accessibilityState={{ selected: rich }}
          onPress={() => setRich(true)}
        >
          <ThemedText>
            {t('form.composerMode.richText', { defaultValue: 'Rich text' })}
          </ThemedText>
        </Button>
      </View>
      <OpenpeepsMarkdownInput {...props} formattingToolbar={rich} />
    </View>
  );
};
