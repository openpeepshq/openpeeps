import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Article,
  PostCreationData,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import {
  ARTICLE_SLUG_MAX_LENGTH,
  canUseInstanceScopedSlug,
  slugify,
} from '@openpeepshq/common/lib';
import type { OpenpeepsClient } from '@openpeepshq/client';

export type ArticleSlugStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'error';

export interface UseArticleSlugFieldArgs {
  postData: PostCreationData;
  onChange: (data: PostCreationData) => void;
  /**
   * The id of the article being edited (undefined on the new-article
   * composer). Slug availability checks pass it as `excludePostId` so the
   * article's own current slug is not reported as taken.
   */
  articleId?: string;
  client: OpenpeepsClient;
  profile?: ProfileWithMeta;
}

export interface UseArticleSlugField {
  slug: string;
  instanceScoped: boolean;
  autoGenerate: boolean;
  status: ArticleSlugStatus;
  canInstance: boolean;
  /**
   * Sets the raw slug input value. The field keeps whatever the user typed
   * (so a trailing hyphen can be entered); the article is persisted with the
   * normalized (slugified) form and the availability check runs on that form.
   * An empty string clears the slug.
   */
  setSlug: (value: string) => void;
  /**
   * Snap the input to the normalized slug. Called on blur so a trailing
   * hyphen (or other non-slug characters) the user typed does not linger in
   * the field once they stop typing.
   */
  normalizeSlug: () => void;
  setScope: (next: boolean) => void;
  setAutoGenerate: (next: boolean) => void;
  /** Generate a free slug from the title (the auto-generate-on-blur path). */
  generateFromTitle: () => Promise<void>;
}

/**
 * Shared slug-field state for the article editor: slug + scope editing with a
 * debounced availability check and an auto-generate-from-title action. The
 * web and the React Native composer render different UIs, but both consume
 * this hook so the behavior (debounce, scope gating, exclusion of the
 * edited post's own slug) stays in sync.
 */
export const useArticleSlugField = ({
  postData,
  onChange,
  articleId,
  client,
  profile,
}: UseArticleSlugFieldArgs): UseArticleSlugField => {
  const article = postData.data as Article;
  const canInstance = canUseInstanceScopedSlug(profile?.roles ?? []);

  const [slug, setSlugState] = useState(article.slug ?? '');
  const [instanceScoped, setInstanceScopedState] = useState(
    article.instanceScoped === true,
  );
  const [autoGenerate, setAutoGenerateState] = useState(false);
  const [status, setStatus] = useState<ArticleSlugStatus>('idle');

  const nonce = useRef(0);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = (patch_: Partial<Article>) =>
    onChange({ ...postData, data: { ...article, ...patch_ } });

  const normalizedSlugFor = (value: string) =>
    slugify(value, ARTICLE_SLUG_MAX_LENGTH);

  const check = useCallback(
    async (value: string, instance: boolean) => {
      if (!value) {
        setStatus('idle');
        return;
      }
      const n = ++nonce.current;
      setStatus('checking');
      const r = await client.posts.slugCheck({
        queryParameters: {
          slug: value,
          ...(instance ? { instanceScoped: 'true' } : {}),
          ...(articleId ? { excludePostId: articleId } : {}),
        },
      });
      if (n !== nonce.current) return;
      if ('error' in r) {
        setStatus('error');
        return;
      }
      if (instance && r.data.requiresPermission && !r.data.available) {
        // Permission note is conveyed by the disabled radio; keep neutral.
        setStatus('idle');
        return;
      }
      setStatus(r.data.available ? 'available' : 'taken');
    },
    [articleId, client],
  );

  // Availability is never cached between checks: it must be re-evaluated
  // after a remount with the same slug + scope (switching articles,
  // restoring a draft), so a previous mount's "taken" cannot leak in.

  const scheduleCheck = useCallback(
    (value: string, instance: boolean) => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
      checkTimer.current = setTimeout(() => {
        checkTimer.current = null;
        void check(value, instance);
      }, 300);
    },
    [check],
  );

  // Check on mount and whenever the (normalized) slug or scope changes. The
  // availability check runs on the slugified form — the value that would be
  // persisted — not on the raw input, which may carry a trailing hyphen the
  // user has not finished typing.
  const normalizedSlug = useMemo(
    () => slugify(slug, ARTICLE_SLUG_MAX_LENGTH),
    [slug],
  );
  useEffect(() => {
    if (normalizedSlug) {
      scheduleCheck(normalizedSlug, instanceScoped);
    } else {
      nonce.current++;
      setStatus('idle');
    }
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [normalizedSlug, instanceScoped, scheduleCheck]);

  const setSlug = (value: string) => {
    setSlugState(value);
    patch({ slug: normalizedSlugFor(value) || undefined });
    scheduleCheck(normalizedSlugFor(value), instanceScoped);
  };

  const setScope = (next: boolean) => {
    if (!canInstance && next) return;
    setInstanceScopedState(next);
    patch({ instanceScoped: next || undefined });
  };

  const setAutoGenerate = (next: boolean) => setAutoGenerateState(next);

  const normalizeSlug = useCallback(() => {
    const next = normalizedSlugFor(slug);
    if (next !== slug) {
      // A trailing hyphen (or other non-slug chars) was typed: snap the input
      // and the persisted slug to the normalized form once typing stops.
      setSlugState(next);
      onChange({ ...postData, data: { ...article, slug: next || undefined } });
    }
  }, [slug, article, onChange, postData]);

  const generateFromTitle = useCallback(async () => {
    if (!article.title || normalizedSlug) return;
    const r = await client.posts.slugGenerate({
      title: article.title,
      instanceScoped,
      ...(articleId ? { excludePostId: articleId } : {}),
    });
    if ('error' in r) return;
    const generated = r.data.slug;
    if (generated) {
      setSlugState(generated);
      onChange({ ...postData, data: { ...article, slug: generated } });
      nonce.current++;
      setStatus('checking');
      void check(generated, instanceScoped);
    }
  }, [
    article,
    articleId,
    check,
    client,
    instanceScoped,
    normalizedSlug,
    onChange,
    postData,
  ]);

  return {
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
  };
};
