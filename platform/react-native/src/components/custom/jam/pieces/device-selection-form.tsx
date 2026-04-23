import { Platform, View, Image, Dimensions } from 'react-native';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ThemedText } from '../../../ui/themed-text';
import {
  MediaStreamTrack,
  mediaDevices,
  ScreenCapturePickerView,
  MediaStream,
  RTCView,
} from '@livekit/react-native-webrtc';
import { AudioSession } from '@livekit/react-native';
import { Button } from '../../../ui/button';
import { useOpenpeeps } from '@openpeeps/react';
import { MicIcon, MicOffIcon, VideoIcon, VideoOffIcon } from '../../../icons';
import { useJamSettingsStore } from '../../../../stores/useJamStore';

export const DeviceSelectionForm: React.FC = () => {
  // State and refs
  const screenCaptureRef = useRef(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<MediaStreamTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] =
    useState<MediaStreamTrack | null>(null);
  const { setDefaults, defaults, setDeviceIds, deviceIds } =
    useJamSettingsStore();

  // Constants and hooks
  const screenWidth = Dimensions.get('window').width;
  const { currentProfile } = useOpenpeeps();
  const videoViewSize = screenWidth * 0.5;

  // Cleanup function for media tracks
  const cleanupMediaTracks = useCallback(() => {
    if (localAudioTrack) {
      localAudioTrack.stop();
      setLocalAudioTrack(null);
    }
    if (localVideoTrack) {
      localVideoTrack.stop();
      setLocalVideoTrack(null);
    }
    setLocalStream(null);
    setDefaults(false, false, false);
  }, [localAudioTrack, localVideoTrack, setDefaults]);

  // Initialize audio session
  useEffect(() => {
    cleanupMediaTracks();

    const startAudioSession = async () => {
      await AudioSession.startAudioSession();
    };
    startAudioSession();

    return () => {
      cleanupMediaTracks();
      AudioSession.stopAudioSession();
    };
  }, [cleanupMediaTracks]);

  // Device control handlers
  const toggleCamera = async () => {
    if (localVideoTrack) {
      localVideoTrack.stop();
      setLocalVideoTrack(null);
      setLocalStream(null);
      setDeviceIds({
        microphone: deviceIds.microphone,
        camera: '',
        screenshare: deviceIds.screenshare,
      });
      setDefaults(defaults.audio, false, defaults.screenshare);
    } else {
      try {
        const stream = await mediaDevices.getUserMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        if (track) {
          setLocalVideoTrack(track);
          setLocalStream(stream);
          setDeviceIds({
            microphone: deviceIds.microphone,
            camera: track.id,
            screenshare: deviceIds.screenshare,
          });
          setDefaults(defaults.audio, true, defaults.screenshare);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrack) {
      localAudioTrack.stop();
      setLocalAudioTrack(null);
      setDeviceIds({
        microphone: '',
        camera: deviceIds.camera,
        screenshare: deviceIds.screenshare,
      });
      setDefaults(false, defaults.video, defaults.screenshare);
    } else {
      try {
        const stream = await mediaDevices.getUserMedia({ audio: true });
        const track = stream.getAudioTracks()[0];
        if (track) {
          setLocalAudioTrack(track);
          setDeviceIds({
            microphone: track.id,
            camera: deviceIds.camera,
            screenshare: deviceIds.screenshare,
          });
          setDefaults(true, defaults.video, defaults.screenshare);
        }
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    }
  };

  const renderVideoView = () => {
    if (localStream) {
      return (
        <RTCView
          streamURL={localStream.toURL()}
          style={{
            width: videoViewSize,
            height: videoViewSize,
            borderRadius: 12,
          }}
          mirror={true}
          objectFit="cover"
        />
      );
    }

    if (currentProfile?.avatar) {
      return (
        <Image
          source={{ uri: currentProfile.avatar }}
          style={{
            width: 50,
            height: 50,
            borderRadius: 30,
          }}
        />
      );
    }

    return (
      <ThemedText className="text-lg text-white">Camera is off</ThemedText>
    );
  };

  return (
    <View className="flex-1 justify-center items-center">
      <View
        style={{
          width: videoViewSize,
          aspectRatio: 1,
          backgroundColor: '#000',
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}>
        {renderVideoView()}
      </View>

      <View className="flex-row gap-2 mt-4">
        <Button
          variant={localAudioTrack ? 'ghost' : 'destructive'}
          size={'default'}
          onPress={toggleAudio}
          className={!localAudioTrack ? 'bg-red-600' : ''}>
          {localAudioTrack ? (
            <MicIcon size={24} className="text-foreground" />
          ) : (
            <MicOffIcon size={24} className="text-foreground" />
          )}
        </Button>
        <Button
          variant={localVideoTrack ? 'ghost' : 'destructive'}
          size={'default'}
          onPress={toggleCamera}
          className={!localVideoTrack ? 'bg-red-600' : ''}>
          {localVideoTrack ? (
            <VideoIcon size={24} className="text-foreground" />
          ) : (
            <VideoOffIcon size={24} className="text-foreground" />
          )}
        </Button>
      </View>

      {Platform.OS === 'ios' && (
        <ScreenCapturePickerView ref={screenCaptureRef} />
      )}
    </View>
  );
};
