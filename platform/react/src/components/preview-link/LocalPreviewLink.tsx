import { isGroupPath, isJamPath, isPostPath } from './helpers';
import { GroupPreview } from './local/GroupPreview';
import { PostPreview } from './local/PostPreview';

export interface LocalPreviewLinkProps {
  url: string;
}

export function LocalPreviewLink({ url }: LocalPreviewLinkProps) {
  const path = new URL(url).pathname;
  const isPost = isPostPath(path);
  const isJam = isJamPath(path);
  const isGroup = isGroupPath(path);

  return (
    <a
      href={url}
      className="hover:bg-surface-100 mb-2 block w-full min-w-0 max-w-full overflow-hidden rounded-md border p-3 no-underline"
      onClick={(e) => e.stopPropagation()}
    >
      {isPost ? <PostPreview path={path} /> : null}
      {isGroup ? <GroupPreview path={path} /> : null}
      {isJam ? (
        <p className="text-sm font-medium">Jam session</p>
      ) : null}
    </a>
  );
}
