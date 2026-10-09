import type { PublicPost } from '@openpeepshq/common/types';
import { FullPostLayout } from '../../FullPostLayout';
import { FeedPost } from '../../FeedPost';
import { PostMarkdown } from '../../Markdown';
import { ResourceCard } from '../../../resources/ResourceCard';

export interface FullResourceProps {
  post: PublicPost;
}

export const FullResource = ({ post }: FullResourceProps) => {
  const resource = post.data?.type === 'resource' ? post.data : null;

  return (
    <FullPostLayout post={post} deleteCallback={() => window.history.back()}>
      <FeedPost
        post={post}
        noReactionHeader
        deleteCallback={() => window.history.back()}
        content={
          <div className="flex w-full min-w-0 flex-col gap-3">
            <ResourceCard post={post} />
            {resource?.content ? (
              <PostMarkdown source={resource.content} />
            ) : null}
          </div>
        }
      />
    </FullPostLayout>
  );
};
