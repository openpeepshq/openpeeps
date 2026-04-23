import * as React from 'react';
import { useState } from 'react';
import { ScreenCapturePickerView } from '@livekit/react-native-webrtc';
import {
  findNodeHandle,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '~/components/ui/button';
import {
  MicIcon,
  MicOffIcon,
  CameraIcon,
  CameraOffIcon,
  MoreVerticalIcon,
  PhoneOffIcon,
  HandIcon,
  MessageSquareIcon,
  UsersIcon,
  UserCogIcon,
  InfoIcon,
  ScreenShareIcon,
  CircleIcon,
} from '~/components/icons';
import { useLocalParticipant, useRoomContext } from '@livekit/react-native';
import { toggleHand } from '~/lib/jam-actions';
import { ThemedText } from '~/components/ui/themed-text';
import { jamEmojis } from '~/lib/constants';
import { useOpenpeeps } from '@openpeeps/react';
import { MetadataType } from '~/types';
import uuid from 'react-native-uuid';
import { useJamStore, useOwnReactionsStore } from '~/stores/useJamStore';
import { PublicProfile } from '@openpeeps/common';
import { Buffer } from 'react-native-buffer';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import { useTranslation } from 'react-i18next';

interface RoomControlsProps {
  toggleMic?: () => Promise<void>;
  toggleCamera?: () => Promise<void>;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  screenShareEnabled?: boolean;
  setScreenShareEnabled?: (enabled: boolean) => void;
  sendData?: (message: string) => void;
  onDisconnectClick: () => void;
  toggleJamMenu: () => void;
}

const ControlButton: React.FC<{
  variant: 'secondary' | 'destructive';
  enabled?: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  width?: number;
}> = ({ variant, enabled, onPress, icon, width = 20 }) => (
  <Button
    variant={variant}
    size="icon"
    className={`w-${width} h-12 rounded-full ${enabled
      ? 'bg-[#333]'
      : variant === 'destructive'
        ? 'bg-red-600'
        : 'bg-[#333]'
      } justify-center items-center`}
    onPress={onPress}>
    {icon}
  </Button>
);

export const RoomControls: React.FC<RoomControlsProps> = ({
  micEnabled = false,
  cameraEnabled = false,
  onDisconnectClick,
  toggleMic,
  toggleCamera,
  toggleJamMenu,
}) => {
  const room = useRoomContext();

  const [isHandRaised, setIsHandRaised] = useState(false);

  React.useEffect(() => {
    const metadata = JSON.parse(room.localParticipant.metadata || '{}');
    setIsHandRaised(metadata.handRaised === true);
  }, [room.localParticipant]);

  const renderControlButtons = () => [
    {
      variant: cameraEnabled ? 'secondary' : 'destructive',
      enabled: cameraEnabled,
      onPress: () => {
        toggleCamera && toggleCamera().then(() => { });
      },
      icon: cameraEnabled ? (
        <CameraIcon size={24} className="text-white" />
      ) : (
        <CameraOffIcon size={24} className="text-white" />
      ),
    },
    {
      variant: micEnabled ? 'secondary' : 'destructive',
      enabled: micEnabled,
      onPress: () => {
        toggleMic && toggleMic().then(() => { });
      },
      icon: micEnabled ? (
        <MicIcon size={24} className="text-white" />
      ) : (
        <MicOffIcon size={24} className="text-white" />
      ),
    },
    {
      variant: 'secondary',
      enabled: true,
      onPress: () => {
        toggleHand(room).then(() => {
          setIsHandRaised(!isHandRaised);
        });
      },
      custom: true,
      customComponent: (
        <Button
          key={'hand-raise'}
          variant="secondary"
          size="icon"
          className={`w-14 h-13 rounded-full justify-center items-center
            
            ${isHandRaised ? 'bg-foreground' : 'bg-[#333]'}
            `}
          onPress={() => {
            toggleHand(room).then(() => {
              setIsHandRaised(!isHandRaised);
            });
          }}>
          {isHandRaised ? (
            <HandIcon size={24} className="text-background" />
          ) : (
            <HandIcon size={24} className="text-foreground" />
          )}
        </Button>
      ),
      icon: isHandRaised ? (
        <HandIcon size={24} className="text-white" />
      ) : (
        <HandIcon size={24} className="text-red-500" />
      ),
    },
    {
      variant: 'secondary',
      enabled: true,
      onPress: () => {
        toggleJamMenu();
      },
      icon: <MoreVerticalIcon size={24} color="white" />,
      width: 12,
    },
    {
      variant: 'destructive',
      enabled: false,
      onPress: onDisconnectClick,
      icon: <PhoneOffIcon size={24} color="white" />,
    },
  ];

  return (
    <View className="flex-row justify-between p-4 ">
      {renderControlButtons().map((button, index) => {
        if (button.custom) {
          return button.customComponent;
        }
        return (
          <ControlButton
            key={index}
            variant={button.variant as 'secondary' | 'destructive'}
            enabled={button.enabled}
            onPress={button.onPress}
            icon={button.icon}
            width={button.width}
          />
        );
      })}
    </View>
  );
};

interface JamRoomMenuProps {
  onOpenPeople: () => void;
  onOpenJamInfo: () => void;
  onInJamChat: () => void;
  onHostControls: () => void;
  screenCaptureRef: React.RefObject<
    React.ComponentRef<typeof ScreenCapturePickerView> | null
  >;
  setJamMenuOpen: (open: boolean) => void;
}
export const JamRoomMenu: React.FC<JamRoomMenuProps> = ({
  onOpenPeople,
  onOpenJamInfo,
  onInJamChat,
  onHostControls,
  screenCaptureRef,
  setJamMenuOpen,
}) => {
  const { jamPost } = useJamStore();
  const { openpeepsApi } = useOpenpeeps();
  const sendReaction = openpeepsApi.createJamEventAction({ id: jamPost?.id || '' });
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const { addOwnReaction } = useOwnReactionsStore();
  const { t } = useTranslation();
  const localParticipantProfile = (
    JSON.parse(
      localParticipant.metadata || '{}',
    ) as MetadataType
  ).profile as PublicProfile;

  const handleSendReaction = (reaction: string) => {
    const messageBody = {
      content: reaction,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'reaction' as
        | 'message'
        | 'reaction'
        | 'start'
        | 'join'
        | 'leave'
        | 'close',
      id: uuid.v4(),
      jamId: jamPost?.id || '',
      profileId: localParticipantProfile.id,
      sender: {
        profile: (JSON.parse(localParticipant.metadata || '{}') as MetadataType)
          .profile as PublicProfile,
        participantId: localParticipant.identity,
      },
    };
    sendReaction({
      ...messageBody,
    })
      .then(async () => {
        const serializedMessage = JSON.stringify(messageBody);
        const encodedMessage = Buffer.from(serializedMessage, 'utf-8');
        await room.localParticipant.publishData(encodedMessage, {
          reliable: false,
        });
        addOwnReaction(messageBody);
      })
      .catch(err => {
        console.log('reaction failed to send: ' + err);
      });
  };

  const handleStartBroadcast = async () => {
    console.log('handleStartBroadcast');
    try {
      if (Platform.OS === 'ios') {
        const reactTag = findNodeHandle(screenCaptureRef.current);
        await NativeModules.ScreenCapturePickerViewManager.show(reactTag);
      }
      await localParticipant.setScreenShareEnabled(true);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('common.errors.error'),
      });
      console.log('failed to broadcast', error);
    }
    console.log('handleStartBroadcast done');
  };

  const onRecord = () => {
    try {
    } catch (err) { }
  };

  return (
    <Pressable
      onPress={() => setJamMenuOpen(false)}
      className="w-full h-full absolute top-0 left-0 z-50 flex items-end justify-end">
      <View className="w-full p-4">
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          className="flex-row p-4 bg-background rounded-lg">
          {jamEmojis.map((emoji, index) => {
            return (
              <TouchableOpacity
                key={index}
                className="w-14 h-13 p-4 rounded-full justify-center items-center"
                onPress={() => {
                  handleSendReaction(emoji);
                }}>
                <ThemedText>{emoji}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View className="flex-row flex-wrap justify-between gap-4 p-2 bg-background rounded-lg mt-2">
          {[
            {
              icon: MessageSquareIcon,
              label: 'In-jam messages',
              action: onInJamChat,
            },
            { icon: CircleIcon, label: 'Record', action: onRecord },
            {
              icon: ScreenShareIcon,
              label: 'Screen Share',
              action: handleStartBroadcast,
            },
            { icon: InfoIcon, label: 'Jam info', action: onOpenJamInfo },
            { icon: UsersIcon, label: 'People', action: onOpenPeople },
            { icon: UserCogIcon, label: 'Host controls', action: onHostControls },
          ].map(({ icon: Icon, label, action }, index) => (
            <TouchableOpacity
              key={index}
              onPress={action}
              className="items-center p-2 flex-[0_0_30%]" // Each item takes about 30% of the row
            >
              <Icon className="text-foreground" />
              <ThemedText className="text-center mt-2">{label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Pressable>
  );
};
