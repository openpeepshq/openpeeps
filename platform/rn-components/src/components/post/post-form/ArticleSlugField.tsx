import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { PostCreationData } from '@openpeepshq/common';
import { ARTICLE_SLUG_MAX_LENGTH } from '@openpeepshq/common/lib';
import { useArticleSlugField, useOpenpeeps } from '@openpeepshq/react';
import { ThemedText } from '../../ui/themed-text';
import { ThemedView } from '../../ui/themed-view';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';

export interface ArticleSlugFieldProps {
  postData: PostCreationData;
  onChange: (data: PostCreationData) => void;
  isEdit?: boolean;
  /** Id of the article being edited, so its own slug is not "taken". */
  articleId?: string;
}

/**
 * React Native mirror of the web `ArticleSlugField`. It renders the same
 * slug input, scope radios and auto-generate control, but all behavior lives
 * in the shared `useArticleSlugField` hook (web/native parity), so the two
 * stay in sync.
 */
export const ArticleSlugField = ({
  postData,
  onChange,
  isEdit = false,
  articleId,
}: ArticleSlugFieldProps) => {
  const { t } = useTranslation();
  const { client, currentProfile } = useOpenpeeps();
  const {
    slug,
    instanceScoped,
    autoGenerate,
    status,
    canInstance,
    setSlug,
    normalizeSlug,
    setScope,
    setAutoGenerate,
    generateFromTitle,
  } = useArticleSlugField({
    postData,
    onChange,
    articleId,
    client,
    profile: currentProfile,
  });

  const statusText =
    status === 'checking'
      ? t('articles.form.checking', { defaultValue: 'Checking…' })
      : status === 'available'
        ? t('articles.form.available', { defaultValue: 'Available' })
        : status === 'taken'
          ? t('articles.form.taken', { defaultValue: 'Taken' })
          : null;
  const statusColor =
    status === 'checking'
      ? 'text-warning'
      : status === 'available'
        ? 'text-success'
        : status === 'taken'
          ? 'text-error'
          : 'text-muted-foreground';

  return (
    <ThemedView className="mt-4 rounded-lg border p-4">
      <ThemedView className="gap-y-3">
        <ThemedView>
          <ThemedText className="mb-1 text-sm">
            {t('articles.form.slug', { defaultValue: 'Slug (optional)' })}
          </ThemedText>
          <ThemedView className="flex-row items-center gap-2">
            <ThemedText className="text-sm text-muted-foreground">/</ThemedText>
            <Input
              value={slug}
              onChangeText={(value) => setSlug(value)}
              onBlur={() => {
                normalizeSlug();
                if (autoGenerate) void generateFromTitle();
              }}
              placeholder={t('articles.form.slugPlaceholder', {
                defaultValue: 'my-article',
              })}
              maxLength={ARTICLE_SLUG_MAX_LENGTH}
              className="h-9 flex-1"
            />
            {slug && statusText ? (
              <ThemedText className={`text-xs font-medium ${statusColor}`}>
                {statusText}
              </ThemedText>
            ) : null}
          </ThemedView>
        </ThemedView>

        <RadioGroup
          value={instanceScoped ? 'instance' : 'profile'}
          onValueChange={(v) => setScope(v === 'instance')}
          className="flex-row gap-4"
        >
          <ThemedView className="flex-row items-center gap-2">
            <RadioGroupItem value="profile" />
            <ThemedText className="text-sm">
              {t('articles.form.profileScoped', {
                defaultValue: 'Profile-scoped (/@handle/slug)',
              })}
            </ThemedText>
          </ThemedView>
          <ThemedView className="flex-row items-center gap-2">
            <RadioGroupItem value="instance" disabled={!canInstance} />
            <ThemedText
              className={
                canInstance ? 'text-sm' : 'text-sm text-muted-foreground'
              }
            >
              {t('articles.form.instanceScoped', {
                defaultValue: 'Instance-wide (/{slug})',
              })}
            </ThemedText>
            {!canInstance ? (
              <ThemedText className="text-xs">
                {t('articles.form.requiresPermission', {
                  defaultValue: 'Requires permission',
                })}
              </ThemedText>
            ) : null}
          </ThemedView>
        </RadioGroup>

        <ThemedView className="flex-row items-center gap-2">
          <Switch
            checked={autoGenerate}
            onCheckedChange={(c) => setAutoGenerate(!!c)}
          />
          <ThemedText className="text-sm">
            {t('articles.form.autoGenerate', {
              defaultValue: 'Auto-generate from title on blur',
            })}
          </ThemedText>
        </ThemedView>

        <ThemedText className="text-xs text-muted-foreground">
          {isEdit
            ? t('articles.form.slugEditHint', {
                defaultValue: 'Changing the slug will update the article URL.',
              })
            : t('articles.form.slugHint', {
                defaultValue:
                  'A slug gives your article a clean, shareable URL.',
              })}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
};
