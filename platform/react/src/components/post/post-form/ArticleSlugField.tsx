import type { PostCreationData } from '@openpeepshq/common/types';
import { ARTICLE_SLUG_MAX_LENGTH } from '@openpeepshq/common/lib';
import {
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Switch,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useArticleSlugField, type ArticleSlugStatus } from '../../../hooks';

/**
 * Core article-slug field (editor, new + edit): slug input with debounced
 * availability check, profile-/instance-scoped scope radios, and an
 * auto-generate-from-title control. All state lives in
 * `useArticleSlugField` so the React Native composer renders the same
 * behavior.
 *
 * Permissions are capability-based: the instance-scoped radio is disabled
 * (but still identified, with a note) unless the signed-in profile holds
 * `core-posts-slug-instance` — owner inherits it via `*`, and admin/moderator
 * carry it in the role defaults, so the owner is no longer blocked.
 */
export interface ArticleSlugFieldProps {
  postData: PostCreationData;
  onChange: (data: PostCreationData) => void;
  isEdit?: boolean;
  /** Id of the article being edited, so its own slug is not "taken". */
  articleId?: string;
}

export const ArticleSlugField = ({
  postData,
  onChange,
  isEdit = false,
  articleId,
}: ArticleSlugFieldProps) => {
  const t = useT();
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

  const statusMeta: Record<ArticleSlugStatus, string | null> = {
    idle: null,
    checking: t('articles.form.checking', { defaultValue: 'Checking…' }),
    available: t('articles.form.available', { defaultValue: 'Available' }),
    taken: t('articles.form.taken', { defaultValue: 'Taken' }),
    error: null,
  };
  const statusColor: Record<ArticleSlugStatus, string> = {
    idle: 'text-muted-foreground',
    checking: 'text-warning',
    available: 'text-success',
    taken: 'text-error',
    error: 'text-muted-foreground',
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="space-y-3">
        <Label
          title={t('articles.form.slug', { defaultValue: 'Slug (optional)' })}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">/</span>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
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
            {slug && statusMeta[status] ? (
              <span className={`text-xs font-medium ${statusColor[status]}`}>
                {statusMeta[status]}
              </span>
            ) : null}
          </div>
        </Label>

        <RadioGroup
          value={instanceScoped ? 'instance' : 'profile'}
          onValueChange={(v) => setScope(v === 'instance')}
          className="flex-row gap-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="profile" />
            {t('articles.form.profileScoped', {
              defaultValue: 'Profile-scoped (/@handle/slug)',
            })}
          </label>
          <label
            className={`flex items-center gap-2 text-sm ${
              canInstance ? '' : 'text-muted-foreground'
            }`}
          >
            <RadioGroupItem value="instance" disabled={!canInstance} />
            <span>
              {t('articles.form.instanceScoped', {
                defaultValue: 'Instance-wide (/{slug})',
              })}
              {!canInstance && (
                <span className="block text-xs">
                  {t('articles.form.requiresPermission', {
                    defaultValue: 'Requires permission',
                  })}
                </span>
              )}
            </span>
          </label>
        </RadioGroup>

        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={autoGenerate}
            onCheckedChange={(c) => setAutoGenerate(!!c)}
          />
          {t('articles.form.autoGenerate', {
            defaultValue: 'Auto-generate from title on blur',
          })}
        </label>

        <p className="text-xs text-muted-foreground">
          {isEdit
            ? t('articles.form.slugEditHint', {
                defaultValue: 'Changing the slug will update the article URL.',
              })
            : t('articles.form.slugHint', {
                defaultValue:
                  'A slug gives your article a clean, shareable URL.',
              })}
        </p>
      </div>
    </div>
  );
};
