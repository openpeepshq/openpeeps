import React from 'react';
import { RoomControls } from './room-controls';
import { useLocalParticipant, useRoomContext } from '@livekit/react-native';
import { toggleCamera, toggleMicrophone } from '../../../../lib/jam-actions';
import { Platform, findNodeHandle, NativeModules } from 'react-native';
import { ScreenCapturePickerView } from '@livekit/react-native-webrtc';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ExitJamOptionsSheet } from '../../modals';

interface JamFooterProps {
  handleGoBack: () => void;
  screenCaptureRef: React.RefObject<
    React.ComponentRef<typeof ScreenCapturePickerView> | null
  >;
  toggleJamMenu: () => void;
}

export const JamFooter: React.FC<JamFooterProps> = ({
  handleGoBack,
  screenCaptureRef,
  toggleJamMenu,
}) => {
  const room = useRoomContext();
  const { isCameraEnabled, isScreenShareEnabled, localParticipant } =
    useLocalParticipant();
  const exitJamSheetRef = React.useRef<BottomSheetModal>(null);

  const handleExitJamSheetModalPress = React.useCallback(() => {
    exitJamSheetRef.current?.present();
  }, []);

  const handleStartBroadcast = async () => {
    if (Platform.OS === 'ios') {
      const reactTag = findNodeHandle(screenCaptureRef.current);
      await NativeModules.ScreenCapturePickerViewManager.show(reactTag);
    }
    localParticipant.setScreenShareEnabled(true);
  };
  return (
    <>
      <RoomControls
        micEnabled={localParticipant.isMicrophoneEnabled}
        toggleMic={async () => {
          await toggleMicrophone(room);
        }}
        toggleCamera={async () => {
          await toggleCamera(room);
        }}
        cameraEnabled={isCameraEnabled}
        screenShareEnabled={isScreenShareEnabled}
        setScreenShareEnabled={enabled => {
          enabled
            ? handleStartBroadcast()
            : localParticipant.setScreenShareEnabled(enabled);
        }}
        onDisconnectClick={handleExitJamSheetModalPress}
        toggleJamMenu={toggleJamMenu}
      />
      <ExitJamOptionsSheet handleGoBack={handleGoBack} ref={exitJamSheetRef} />
    </>
  );
};
