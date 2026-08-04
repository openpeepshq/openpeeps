import { isGroupPath, isJamPath, isPostPath } from './helpers';
import { GroupPreview } from './local/GroupPreview';
import { PostPreview } from './local/PostPreview';
import { JamPreview } from './local/JamPreview';

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
      className="hover:bg-muted mb-2 block w-full min-w-0 max-w-full overflow-hidden rounded-md border p-3 no-underline"
      onClick={(e) => e.stopPropagation()}
    >
      {isPost ? <PostPreview path={path} /> : null}
      {isGroup ? <GroupPreview path={path} /> : null}
      {isJam ? <JamPreview path={path} /> : null}
    </a>
  );
}
