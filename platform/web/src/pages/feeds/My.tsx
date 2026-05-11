import { useT, useOpenpeeps } from '@openpeeps/react';
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

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">
        {t('navigation.myFeed', { defaultValue: 'My feed' })}
      </h1>
      <NewNoteButton
        visibility={visibility}
        currentProfile={currentProfile}
      />
      <Feed query={query} />
    </div>
  );
}
