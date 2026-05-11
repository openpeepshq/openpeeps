import { ArrowRight } from 'lucide-react';
import type { PublicPost } from '@openpeeps/common/types';
import { useT } from '../../../i18n';
import { PostMarkdown } from '../Markdown';
import { firstNWords } from '../helpers';

export interface FeedArticleProps {
  post: PublicPost;
}

export function FeedArticle({ post }: FeedArticleProps) {
  const t = useT();
  const article = post.data as {
    title?: string;
    image?: string;
    content?: string;
  };
  const previewContent = firstNWords(article.content, 50);
  const showReadMore =
    !!article.content && previewContent.length < article.content.length;

  return (
    <div className="flex w-full flex-col gap-2">
      {article.image && (
        <img
          src={article.image}
          className="w-full object-cover"
          alt={`image for ${article.title ?? 'article'}`}
        />
      )}
      <div className="prose">
        <h3>{article.title}</h3>
      </div>
      <PostMarkdown source={`${previewContent}${showReadMore ? '...' : ''}`} />
      {showReadMore && (
        <div className="flex justify-end">
          <a
            href={`/posts/${post.id}`}
            className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
          >
            {t('posts.article.readMore', { defaultValue: 'Read more' })}
            <ArrowRight className="inline-block size-4" />
          </a>
        </div>
      )}
    </div>
  );
}
