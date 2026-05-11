import { useState, useEffect, useRef } from 'react';
import type { PublicPost } from '@openpeeps/common/types';
import { buildThreads } from '@openpeeps/common/lib';

import { useT } from '../../i18n';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../layout/IdentityContext';
import { Button, Textarea } from '@openpeeps/react-ui';

import { FeedPost } from './FeedPost';

export interface PostDetailProps {
  postId: string;
}

/**
 * Translation of the four `Full*` post components in
 * `@openpeeps/svelte/components/core/post/types/*`. Renders the post with its
 * ancestor + descendant threads and a small inline reply composer.
 *
 * The Svelte version has dedicated `FullEvent` (with RSVP/jam buttons),
 * `FullArticle` (long-form rendering) and `FullPoll` (voting UI). Until those
 * specialised renderers are ported, this component falls back to the feed
 * card for every post type.
 */
export function PostDetail({ postId }: PostDetailProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const createPost = openpeepsApi.createPostAction();

  const postQuery = openpeepsApi.usePost(postId);
  const contextQuery = openpeepsApi.usePostContext(postId);

  const post = postQuery.data;
  const ctx = contextQuery.data;

  const ancestorThread = ctx?.ancestors ? buildThreads(ctx.ancestors)[0] : undefined;
  const descendantThreads = ctx?.descendants ? buildThreads(ctx.descendants) : [];

  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [post?.id]);

  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReply = async () => {
    if (!post) return;
    setError(null);
    setSubmitting(true);
    try {
      await createPost({
        visibility: post.visibility,
        type: 'note',
        data: { type: 'note', content: replyContent },
        groupId: post.groupId ?? undefined,
        inReplyToId: post.id,
      });
      setReplyContent('');
    } catch (err) {
      setError((err as Error).message ?? 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (postQuery.isLoading || contextQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-2xl font-bold">
          {t('post.notFound', { defaultValue: 'Post not found' })}
        </p>
      </div>
    );
  }

  const renderThread = (head: PublicPost, indent = 0): React.ReactNode => {
    const replies = (head as PublicPost & { replies?: PublicPost[] }).replies ?? [];
    return (
      <div key={head.id} style={{ marginLeft: indent ? indent * 16 : 0 }}>
        <a href={`/posts/${head.id}`}>
          <FeedPost post={head} noReactionHeader />
        </a>
        {replies.map((reply) => renderThread(reply, indent + 1))}
      </div>
    );
  };

  return (
    <div>
      {ancestorThread && renderThread(ancestorThread)}

      <div ref={ref}>
        <FeedPost post={post} noReactionHeader />
      </div>

      {currentProfile && (
        <div className="mx-auto max-w-2xl space-y-2 border-b border-border p-4">
          <Textarea
            rows={3}
            placeholder={t('posts.replyPlaceholder', {
              defaultValue: 'Write a reply…',
            })}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
          />
          {error && (
            <p className="text-error rounded-md border border-error/40 p-2 text-xs">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              title="Reply"
              variant="variant-filled-primary"
              action={submitReply}
              disabled={submitting || replyContent.trim().length === 0}
            >
              {submitting
                ? t('common.posting', { defaultValue: 'Posting…' })
                : t('posts.reply', { defaultValue: 'Reply' })}
            </Button>
          </div>
        </div>
      )}

      {descendantThreads.map((thread) => renderThread(thread))}

      <div className="h-[40vh]" />
    </div>
  );
}
