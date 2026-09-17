import type { PublicProfile } from '@openpeepshq/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Avatar } from '../../components';
import { Button } from '@openpeepshq/react-ui';

export function BlockedSettings() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const blockedQuery = openpeepsApi.useBlockedProfiles();
  const currentQuery = openpeepsApi.useCurrentProfile();

  useSetPageHeader(t('settings.blocked.title', { defaultValue: 'Blocked' }));

  const profiles = blockedQuery.data ?? [];

  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground text-sm">
        {t('settings.blocked.description', {
          defaultValue: 'People you have blocked',
        })}
      </p>
      {profiles.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t('settings.blocked.empty', {
            defaultValue: "You haven't blocked anyone",
          })}
        </p>
      ) : (
        profiles.map((profile) => (
          <BlockedRow
            key={profile.id}
            profile={profile}
            onUnblocked={() => {
              void blockedQuery.refetch();
              void currentQuery.refetch();
            }}
          />
        ))
      )}
    </div>
  );
}

const BlockedRow = ({
  profile,
  onUnblocked,
}: {
  profile: PublicProfile;
  onUnblocked: () => void;
}) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const unblockProfile = openpeepsApi.unblockProfileAction({ id: profile.id });

  return (
    <div className="flex items-center justify-between gap-3">
      <a
        href={`/@${profile.handle}`}
        className="flex min-w-0 items-center gap-2"
      >
        <Avatar profile={profile} />
        <div className="min-w-0">
          <p className="truncate font-bold">
            {profile.displayName || profile.handle}
          </p>
          <span className="text-muted-foreground text-sm">
            @{profile.handle}
          </span>
        </div>
      </a>
      <Button
        variant="outline"
        action={async () => {
          await unblockProfile(undefined);
          onUnblocked();
        }}
      >
        {t('profile.block.unblock', { defaultValue: 'Unblock' })}
      </Button>
    </div>
  );
};
