import { useT, useOpenpeeps } from '@openpeeps/react';
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

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold" data-testid="feeds-community-heading">
        {t('navigation.community', { defaultValue: 'Community' })}
      </h1>
      <NewNoteButton
        visibility={visibility}
        currentProfile={currentProfile}
      />
      <Feed query={query} pinnedPostId={pinnedPostId ?? undefined} />
    </div>
  );
}
