import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import {
  Feed,
  useDefaultVisibility,
  useNewNotePlusButton,
} from '@openpeeps/react/components';

export function FeedsMy() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const visibility = useDefaultVisibility();

  useNewNotePlusButton({ visibility });

  const query = openpeepsApi.useMyFeed();

  useSetPageHeader(t('navigation.myFeed', { defaultValue: 'My feed' }));

  return (
    <div className="space-y-4 p-4">
      <Feed query={query} />
    </div>
  );
}
