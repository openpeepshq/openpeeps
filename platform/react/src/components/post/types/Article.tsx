import { ArrowRight } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import { useT } from '../../../i18n';
import { resolveStaticUrl, useStaticRender } from '../../markdown/staticRender';
import { PostMarkdown } from '../Markdown';
import { firstNWords } from '../helpers';

export interface FeedArticleProps {
  post: PublicPost;
}

export function FeedArticle({ post }: FeedArticleProps) {
  const t = useT();
  const { enabled: staticRender, baseUrl } = useStaticRender();
  const article = post.data as {
    title?: string;
    image?: string;
    content?: string;
  };
  const previewContent = firstNWords(article.content, 50);
  const showReadMore =
    !!article.content && previewContent.length < article.content.length;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
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
            href={resolveStaticUrl(`/posts/${post.id}`, staticRender ? baseUrl : undefined)}
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
