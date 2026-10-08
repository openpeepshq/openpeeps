import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type {
  Article,
  AudienceSetting,
  PostCreationData,
} from '@openpeepshq/common';
import { HEADER_IMAGE_MAX_WIDTH } from '@openpeepshq/common/lib';
import { applyAudienceSetting, useCurrentProfile } from '@openpeepshq/react';
import { ImageInput } from '~/components/form/ImageInput';
import { Input } from '~/components/ui/input';
import { ThemedText } from '~/components/ui/themed-text';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import { VisibilitySelector } from './VisibilitySelector';

export interface ArticleFormProps {
  postData: PostCreationData;
  onChange: (data: PostCreationData) => void;
  isEdit?: boolean;
}

export const ArticleForm = ({
  postData,
  onChange,
  isEdit = false,
}: ArticleFormProps) => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const article = postData.data as Article;

  const patchArticle = (patch: Partial<Article>) =>
    onChange({ ...postData, data: { ...article, ...patch } });

  const setAudience = (settings: AudienceSetting) =>
    onChange(applyAudienceSetting(postData, settings, me));

  return (
    <View>
      <ImageInput
        usage="article-header-image"
        url={article.image}
        onChange={(image) => patchArticle({ image })}
        text={t('articles.form.uploadCover', {
          defaultValue: 'Upload your cover image',
        })}
        specsText={t('form.imageInput.recommendedWidth', {
          defaultValue: 'Recommended width {{width}} pixels',
          width: HEADER_IMAGE_MAX_WIDTH,
        })}
      />

      <View className="mt-4 gap-y-4 px-3">
        <ThemedText className="text-lg">
          {t('articles.form.title', { defaultValue: 'New Article' })}
        </ThemedText>

        <View className="gap-y-1">
          <ThemedText className="text-sm font-medium">
            {t('articles.form.title', { defaultValue: 'New Article' })}
          </ThemedText>
          <Input
            value={article.title ?? ''}
            onChangeText={(title) => patchArticle({ title })}
          />
        </View>

        <OpenpeepsMarkdownInput
          rows={16}
          maxLength={10000}
          value={article.content ?? ''}
          onChange={(content) => patchArticle({ content })}
          placeholder={t('articles.form.contentPlaceholder', {
            defaultValue:
              'Write your content here.  User markdown for formatting',
          })}
        />

        <View className="gap-y-1">
          <ThemedText className="text-sm font-medium">
            {t('articles.form.visibility', {
              defaultValue: 'Who can see this (Required)',
            })}
          </ThemedText>
          <ThemedText className="text-xs text-muted-foreground">
            {t('articles.form.visibilityNotChangeable', {
              defaultValue:
                "Once you post your article, you can't change the visibility",
            })}
          </ThemedText>
          <VisibilitySelector
            audienceSetting={postData}
            onChange={setAudience}
            disabled={isEdit}
            showDirect
          />
        </View>
      </View>
    </View>
  );
};
