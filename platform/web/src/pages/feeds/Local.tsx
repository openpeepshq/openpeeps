import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import {
  Feed,
  NewNoteButton,
  useCurrentProfile,
  useDefaultVisibility,
  useServerInfo,
} from '@openpeeps/react/components';

export function FeedsLocal() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const visibility = useDefaultVisibility();
  const serverInfo = useServerInfo();

  const query = openpeepsApi.useLocalFeed({ limit: 15 });
  const pinnedPostId = serverInfo.communityConfig?.content?.pinnedPost;

  useSetPageHeader(
    t('navigation.community', { defaultValue: 'Community' }),
    undefined,
    'feeds-community-heading',
  );

  return (
    <div className="space-y-4 p-4">
      <NewNoteButton
        visibility={visibility}
        currentProfile={currentProfile}
      />
      <Feed query={query} pinnedPostId={pinnedPostId ?? undefined} />
    </div>
  );
}
