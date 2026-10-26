import React, { useMemo, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import type { PublicProfile } from '@openpeepshq/common';
import { richTextNeedsSourceMode } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { ProfileAvatar } from '../../profile/Avatar';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { ThemedText } from '../../ui/themed-text';
import { toAbsoluteMediaUrl } from '../../../lib/media-url';
import { cn, maxContentLength } from '../../../lib/utils';
import {
  NativeRichTextField,
  type RichTextApi,
  type RichTextVariant,
} from './rich-text/NativeRichTextField';

export interface OpenpeepsMarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Character budget; the counter turns red once exceeded. */
  maxLength?: number;
  placeholder?: string;
  rows?: number;
  /**
   * Article: headings, quotes, and code.
   * Compact: emphasis, lists, links, and mentions.
   */
  variant?: RichTextVariant;
  /** Extra classes for the source field. */
  className?: string;
  testId?: string;
  autoFocus?: boolean;
}

const mentionQueryFrom = (text: string, cursor: number) => {
  const match = text.slice(0, cursor).match(/@([a-zA-Z0-9_-]*)$/);
  return match ? (match[1] ?? '') : null;
};

/**
 * Formatted text field that stores Markdown. Documents with embeds or fenced
 * code open in the source field, because the mobile editor cannot keep them.
 */
export const OpenpeepsMarkdownInput = ({
  value,
  onChange,
  maxLength = maxContentLength,
  placeholder,
  rows = 5,
  variant = 'compact',
  className,
  testId,
  autoFocus = false,
}: OpenpeepsMarkdownInputProps) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState(() =>
    richTextNeedsSourceMode(value, { fencedCode: true })
  );
  const valueRef = useRef(value);
  const cursorRef = useRef(value.length);
  const richTextRef = useRef<RichTextApi | null>(null);

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
  const showToggle =
    variant === 'article' ||
    richTextNeedsSourceMode(value, { fencedCode: true });

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
    const cursor = event.nativeEvent.selection.start;
    cursorRef.current = cursor;
    updateMentionState(valueRef.current, cursor);
  };

  const insertMention = (profile: PublicProfile) => {
    if (!sourceMode && richTextRef.current) {
      richTextRef.current.insertMention(profile.handle);
      setOpen(false);
      setQuery('');
      return;
    }
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
  const resolvedPlaceholder = placeholder ?? t('posts.form.content');

  return (
    <View className="relative w-full">
      <View className="flex-row items-center gap-3 pb-2">
        {showToggle ? (
          <Button
            size="sm"
            variant="outline"
            onPress={() => {
              setSourceMode((current) => !current);
              setOpen(false);
            }}
          >
            <ThemedText>
              {sourceMode
                ? t('form.richText.formatted')
                : t('form.richText.markdownSource')}
            </ThemedText>
          </Button>
        ) : null}
        <Pressable onPress={openMarkdownHelp} accessibilityRole="link">
          <ThemedText className="text-sm text-primary">
            {t('form.markdownHelp')}
          </ThemedText>
        </Pressable>
      </View>

      {!sourceMode && open ? (
        <TextInput
          value={query}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('form.richText.searchPeople')}
          placeholder={t('form.richText.searchPeople')}
          onChangeText={(next) => {
            setQuery(next);
            setOpen(true);
          }}
          className="mb-2 rounded-md border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground"
        />
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

      {sourceMode ? (
        <Textarea
          autoFocus={autoFocus}
          numberOfLines={rows}
          value={value}
          maxLength={maxLength}
          placeholder={resolvedPlaceholder}
          onChangeText={handleChange}
          onSelectionChange={handleSelectionChange}
          testID={testId}
          className={cn('min-h-[80px]', className)}
        />
      ) : (
        <NativeRichTextField
          value={value}
          onChange={onChange}
          variant={variant}
          placeholder={resolvedPlaceholder}
          maxLength={maxLength}
          rows={rows}
          autoFocus={autoFocus}
          onMentionPress={() => {
            setQuery('');
            setOpen(true);
          }}
          onReady={(api) => {
            richTextRef.current = api;
          }}
        />
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
