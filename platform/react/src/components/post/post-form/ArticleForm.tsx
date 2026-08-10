import { useState } from 'react';
import type {
  Article,
  AudienceSetting,
  PostCreationData,
} from '@openpeepshq/common/types';
import { Input, Label } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { ImageInput } from '../../form/ImageInput';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { PostAudienceSelector } from './PostAudienceSelector';
import { VisibilitySelector } from './VisibilitySelector';

export interface ArticleFormProps {
  postData: PostCreationData;
  onChange: (data: PostCreationData) => void;
  isEdit?: boolean;
}

export function ArticleForm({
  postData,
  onChange,
  isEdit = false,
}: ArticleFormProps) {
  const t = useT();
  const me = useCurrentProfile();

  const article = postData.data as Article;
  const [audienceOpen, setAudienceOpen] = useState(false);

  const patchArticle = (patch: Partial<Article>) => {
    onChange({
      ...postData,
      data: { ...article, ...patch },
    });
  };

  const setAudience = (settings: AudienceSetting) => {
    const audience = settings.audience ?? undefined;
    const includesMe = audience?.some((p) => p.id === me?.id);
    onChange({
      ...postData,
      visibility: settings.visibility,
      groupId: settings.groupId ?? undefined,
      audience:
        settings.visibility === 'direct'
          ? includesMe
            ? audience
            : [...(audience ?? []), ...(me ? [me] : [])]
          : undefined,
    });
  };

  return (
    <div>
      <ImageInput
        usage="article-header-image"
        url={article.image}
        onChange={(image) => patchArticle({ image })}
        className="h-96"
        showSelectAspectRatio
        showFullImage
        text={t('articles.form.uploadCover', {
          defaultValue: 'Upload your cover image',
        })}
        showAltInput={false}
      />

      <div className="mt-4 flex flex-col gap-4 px-3">
        <h2 className="text-lg">
          {t('articles.form.title', { defaultValue: 'New Article' })}
        </h2>

        <Label
          title={t('articles.form.title', { defaultValue: 'New Article' })}
          htmlFor="article-title"
        >
          <Input
            id="article-title"
            value={article.title ?? ''}
            onChange={(e) => patchArticle({ title: e.target.value })}
          />
        </Label>

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
        <ComposePreviewLinks content={article.content} />

        <Label
          title={t('articles.form.visibility', {
            defaultValue: 'Who can see this (Required)',
          })}
          description={t('articles.form.visibilityNotChangeable', {
            defaultValue:
              "Once you post your article, you can't change the visibility",
          })}
        >
          <VisibilitySelector
            postData={postData}
            onClick={() => setAudienceOpen(true)}
            disabled={isEdit}
            showDirect
          />
        </Label>
      </div>

      {!isEdit ? (
        <PostAudienceSelector
          open={audienceOpen}
          onClose={() => setAudienceOpen(false)}
          type="article"
          visibility={postData.visibility}
          groupId={postData.groupId ?? undefined}
          audience={postData.audience ?? []}
          showDirect
          onConfirm={setAudience}
        />
      ) : null}
    </div>
  );
}
