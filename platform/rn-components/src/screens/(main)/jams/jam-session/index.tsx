import React, { useEffect } from 'react';
import { JamRoom } from '~/components/custom';
import { MainScreenProps } from '~/components/navigation/types';
import { useRoomContext, useConnectionState } from '@livekit/react-native';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { JamLobby } from '~/components/custom';
import { useOpenpeeps } from '@openpeepshq/react';
import { ActivityIndicator } from 'react-native';
import { useJamStore } from '~/stores/useJamStore';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '~/components/ui/themed-text';

export const JamSession: React.FC<MainScreenProps<'JamSession'>> = ({
  navigation,
  route,
}) => {
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();
  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const livekitEnabled = serverInfo?.jams.livekit.enabled;
  const jamPost = useJamStore((state) => state.jamPost);
  const setJamPost = useJamStore((state) => state.setJamPost);
  const { jamId } = route.params;
  const { data: loadedJamPost } = jamId
    ? openpeepsApi.usePost(jamId)
    : { data: undefined };

  useEffect(() => {
    if (jamId && loadedJamPost && jamPost?.id !== jamId) {
      setJamPost(loadedJamPost);
    }
    if (!jamId && !jamPost) {
      navigation.pop();
    }
  }, [jamPost, jamId, loadedJamPost, navigation, setJamPost]);

  const room = useRoomContext();
  const connectionState = useConnectionState();

  const handleGoBack = () => navigation.pop();

  useEffect(() => {
    if (!room) {
      navigation.pop();
    }
  }, [room, navigation]);

  if (!jamPost || serverInfo == null) {
    return <ActivityIndicator />;
  }

  if (livekitEnabled === false) {
    return (
      <ThemedSafeAreaView className="flex-1 items-center justify-center p-4">
        <ThemedText className="text-center">
          {t('jams.unavailable.message')}
        </ThemedText>
      </ThemedSafeAreaView>
    );
  }

  if (connectionState === 'connected') {
    return (
      <ThemedSafeAreaView className="flex-1 relative">
        <JamRoom
          handleGoBack={handleGoBack}
          onInJamChat={() => {
            navigation.navigate('InJamChat', { id: jamId });
          }}
          onHostControls={() => {
            navigation.navigate('JamHostControls', { id: jamId });
          }}
          onOpenJamInfo={() => {
            navigation.navigate('JamDetails', { id: jamId, tabOption: 'info' });
          }}
          onOpenPeople={() => {
            navigation.navigate('JamDetails', {
              id: jamId,
              tabOption: 'people',
            });
          }}
        />
      </ThemedSafeAreaView>
    );
  }

  return <JamLobby goBack={handleGoBack} jamPost={jamPost} />;
};
