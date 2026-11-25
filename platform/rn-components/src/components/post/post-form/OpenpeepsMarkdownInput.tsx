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
import { visibleTextLength, type PublicProfile } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { OpenpeepsMarkdown } from '../../markdown/index';
import { ProfileAvatar } from '../../profile/Avatar';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { ThemedText } from '../../ui/themed-text';
import { toAbsoluteMediaUrl } from '../../../lib/media-url';
import { cn, maxContentLength } from '../../../lib/utils';
import {
  applyMarkdownFormat,
  type MarkdownFormat,
  type TextSelection,
} from './markdownFormat';

export interface OpenpeepsMarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Visible-text character budget; the counter turns red once exceeded. */
  maxLength?: number;
  /**
   * Hard-stop typing at the budget. For forms that do not validate the
   * length on submit.
   */
  blockOverflow?: boolean;
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
  blockOverflow = true,
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
    if (visibleTextLength(result.value) > maxLength) return;
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

  // With the native cap on (blockOverflow) the counter tracks the raw length
  // it enforces; otherwise it tracks the visible text the submit check uses.
  // The web rich surface always counts visible text, so the metric can differ
  // between the two — an accepted divergence.
  const shownLength = blockOverflow ? value.length : visibleTextLength(value);
  const overLimit = shownLength > maxLength;

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
                  // `level: 2` is required by the `blockTypes.heading`
                  // "Heading {{level}}" template (used by both the web
                  // BlockTypeSelect and this RN button); 2 matches the `## `
                  // the button actually inserts.
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
            maxLength={blockOverflow ? maxLength : undefined}
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
          {shownLength} / {maxLength}
        </ThemedText>
      </View>
    </View>
  );
};

/**
 * Posts and messages keep the textarea and can show the formatting bar.
 *
 * The shared `form.composerMode.richText` key ("Rich text") intentionally
 * covers both platforms' mode toggles: on web it switches to the visual
 * editor, on native it only reveals the formatting toolbar over the same
 * textarea, so keep copy edits platform-neutral.
 *
 * The web composer's toggle switches to a separate visual editor that honors
 * only `value`, `onChange`, `maxLength`, `placeholder` and `testId` (its
 * JSDoc lists `rows`, `blockOverflow`, `previewButton` and `className` as
 * markdown-mode-only). This RN composer instead keeps the same
 * `OpenpeepsMarkdownInput` in both modes, so every prop is honored in both —
 * the only mode-specific behavior is `formattingToolbar`, which the toggle
 * drives (on in rich mode) rather than being passed through. The prop type
 * stays `OpenpeepsMarkdownInputProps` to match the web component.
 */
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
