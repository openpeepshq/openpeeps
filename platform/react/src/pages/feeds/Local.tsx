import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import {
  Feed,
  useDefaultVisibility,
  useNewNotePlusButton,
  useServerInfo,
  PluginSlot,
} from '../../components';
import { EmptyStateInvite } from '../../onboarding';

export function FeedsLocal() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const serverInfo = useServerInfo();
  const visibility = useDefaultVisibility();

  useNewNotePlusButton({ visibility });

  const query = openpeepsApi.useLocalFeed();
  const pinnedPostId = serverInfo.communityConfig?.content?.pinnedPost;

  useSetPageHeader(
    t('navigation.community', { defaultValue: 'Community' }),
    undefined,
    'feeds-community-heading',
  );

  return (
    <>
      <PluginSlot name="plugins.header" className="p-4 pb-0" />
      <Feed
        query={query}
        pinnedPostId={pinnedPostId ?? undefined}
        emptySlot={<EmptyStateInvite surface="feed" />}
      />
    </>
  );
}
