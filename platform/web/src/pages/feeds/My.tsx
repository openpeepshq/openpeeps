import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import {
  Feed,
  NewNoteButton,
  useCurrentProfile,
  useDefaultVisibility,
} from '@openpeeps/react/components';

export function FeedsMy() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const visibility = useDefaultVisibility();

  const query = openpeepsApi.useMyFeed({ limit: 15 });

  useSetPageHeader(t('navigation.myFeed', { defaultValue: 'My feed' }));

  return (
    <div className="space-y-4 p-4">
      <NewNoteButton
        visibility={visibility}
        currentProfile={currentProfile}
      />
      <Feed query={query} />
    </div>
  );
}
