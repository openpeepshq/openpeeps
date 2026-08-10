import { useT, useOpenpeeps, useSetPageHeader } from '@openpeepshq/react';
import {
  Feed,
  useDefaultVisibility,
  useNewNotePlusButton,
  useServerInfo,
  PluginSlot,
} from '@openpeepshq/react/components';

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
    <div className="space-y-4 p-4">
      <PluginSlot name="plugins.header" className="mb-6" />
      <Feed query={query} pinnedPostId={pinnedPostId ?? undefined} />
    </div>
  );
}
