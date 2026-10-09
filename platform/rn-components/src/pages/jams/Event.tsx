import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentProfile, useOpenpeeps, useRouter } from '@openpeepshq/react';
import { JamRoom } from '../../components/jams/index';
import type { MainScreenProps } from '../../components/navigation/types/index';
import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';
import { ThemedText } from '../../components/ui/themed-text';

/**
 * `JamSession` screen — loads the jam post and hands it off to `<JamRoom>`.
 * The web `?token=` guest handoff has no native counterpart: observer links
 * are opened in the browser.
 */
export const JamEvent = ({ route }: MainScreenProps<'JamSession'>) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { openpeepsApi } = useOpenpeeps();
  const me = useCurrentProfile();
  const { jamId, occurrence, observer = false } = route.params;

  const postQuery = openpeepsApi.usePost(jamId);

  // On a capability/access error, send guests to login and authenticated
  // users back to the jams list.
  useEffect(() => {
    if (!postQuery.isError || !postQuery.error?.message) return;
    router.navigate(me ? { type: 'jams' } : { type: 'auth', mode: 'login' });
  }, [postQuery.isError, postQuery.error, me, router]);

  return (
    <ThemedSafeAreaView className="flex-1 bg-card">
      {postQuery.isLoading ? (
        <ThemedText className="flex-1 p-6 text-center text-sm text-muted-foreground">
          {t('jams.room.loading')}
        </ThemedText>
      ) : !postQuery.data ? (
        <ThemedText className="flex-1 p-6 text-center text-sm text-muted-foreground">
          {t('jams.room.notFound')}
        </ThemedText>
      ) : (
        <JamRoom
          jamPost={postQuery.data}
          observer={observer}
          occurrence={occurrence}
        />
      )}
    </ThemedSafeAreaView>
  );
};
