import type { Article, PublicPost } from '@openpeepshq/common/types';
import { FullPostLayout } from '../../FullPostLayout';
import { FeedPost } from '../../FeedPost';
import { PostMarkdown } from '../../Markdown';

export interface FullArticleProps {
  post: PublicPost;
}

export function FullArticle({ post }: FullArticleProps) {
  const article = post.data as Article;

  return (
    <FullPostLayout
      post={post}
      deleteCallback={() => window.history.back()}
    >
      <FeedPost
        post={post}
        noReactionHeader
        deleteCallback={() => window.history.back()}
        content={
          <div className="flex w-full min-w-0 flex-col gap-2">
            {article.image ? (
              <img
                src={article.image}
                className="w-full object-cover"
                alt={article.title ? `image for ${article.title}` : 'Article'}
              />
            ) : null}
            <div className="prose mb-6">
              <h1>{article.title}</h1>
            </div>
            <PostMarkdown source={article.content ?? ''} />
          </div>
        }
      />
    </FullPostLayout>
  );
}
