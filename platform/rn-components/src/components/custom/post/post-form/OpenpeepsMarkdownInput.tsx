import React, { useMemo, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import type { PublicProfile } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { OpenPeepsMarkdown } from '~/components/custom/markdown';
import { ProfileAvatar } from '~/components/custom/profile/profile-avatar';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { ThemedText } from '~/components/ui/themed-text';
import { toAbsoluteMediaUrl } from '~/lib/media-url';
import { cn, maxContentLength } from '~/lib/utils';

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
  placeholder,
  rows = 5,
  previewButton = true,
  className,
  testId,
}: OpenpeepsMarkdownInputProps) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const valueRef = useRef(value);
  const cursorRef = useRef(value.length);

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
    const cursor = event.nativeEvent.selection.start;
    cursorRef.current = cursor;
    updateMentionState(valueRef.current, cursor);
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
          <OpenPeepsMarkdown source={value} linkPreviewMode="none" />
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
            numberOfLines={rows}
            value={value}
            maxLength={maxLength}
            placeholder={placeholder ?? t('posts.form.content')}
            onChangeText={handleChange}
            onSelectionChange={handleSelectionChange}
            testID={testId}
            className={cn('min-h-[80px]', className)}
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
