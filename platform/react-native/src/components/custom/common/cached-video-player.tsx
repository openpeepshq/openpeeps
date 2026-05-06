import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Video, {
  BufferConfig,
  VideoRef,
  OnLoadData,
  OnProgressData,
} from 'react-native-video';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeftIcon,
  Volume2Icon,
  VolumeOffIcon,
  PlayIcon,
  PauseIcon,
  Repeat2Icon,
} from '~/components/icons';
import { fetchCachedMedia } from '~/utils/media-cache';
import { Button } from '~/components/ui/button';
interface CachedVideoPlayerProps {
  url: string;
  title?: string;
}

export const CachedVideoPlayer: React.FC<CachedVideoPlayerProps> = ({
  url,
}) => {
  const navigation = useNavigation();
  const videoRef = useRef<VideoRef>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const [isViewRotated, setIsViewRotated] = useState<boolean>(false);
  const [progressBarWidth, setProgressBarWidth] = useState<number>(0);
  const [progressBarHeight, setProgressBarHeight] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasEnded, setHasEnded] = useState<boolean>(false);


  const _bufferConfig: BufferConfig = {
    minBufferMs: 15000,
    maxBufferMs: 50000,
    bufferForPlaybackMs: 2500,
    bufferForPlaybackAfterRebufferMs: 5000,
    live: {
      targetOffsetMs: 500,
    },
  };

  useEffect(() => {
    const loadVideo = async () => {
      setLoading(true);
      setIsPaused(true);
      try {
        const cachedPath = await fetchCachedMedia(url, 'video', progress => {
          setDownloadProgress(progress);
        });
        if (cachedPath) { setVideoPath(cachedPath); }
      } catch (err) {
        console.error('Error loading cached video:', err);
        setVideoPath(url);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      loadVideo();
    }

    return () => {
      setVideoPath(null);
      setLoading(true);
      setDownloadProgress(0);
      setIsPaused(true);
      setHasEnded(false);
    };
  }, [url]);

  const togglePlayPause = () => {
    if (isPaused) {
      const isAtEnd = duration > 0 && Math.abs(duration - currentTime) < 0.2;
      if (hasEnded || isAtEnd) {
        videoRef.current?.seek(0);
        setHasEnded(false);
      }
      setIsPaused(false);
    } else {
      setIsPaused(true);
    }
  };

  const onLoad = (data: OnLoadData) => {
    setDuration(data.duration || 0);
    setHasEnded(false);
    setIsPaused(false);
  };

  const onProgress = (data: OnProgressData) => {
    const t = data.currentTime || 0;
    setCurrentTime(t);

    if (duration > 0) {
      const remaining = duration - t;
      if (remaining <= 0.05 && !hasEnded) {
        setHasEnded(true);
        setIsPaused(true);
      } else if (hasEnded && remaining > 0.2) {
        setHasEnded(false);
      }
    }
  };

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (progress: number) => {
    const seekTime = progress * duration;
    videoRef.current?.seek(seekTime);
    if (progress < 0.999) {
      setHasEnded(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const toggleViewRotation = () => {
    setIsViewRotated(prev => !prev);
    console.log('new new', (windowWidth - windowHeight) / 2);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="small" color="white" />
        <Text className="text-white mt-2">
          Loading video... {downloadProgress.toFixed(0)}%
        </Text>
      </View>
    );
  }

  if (!videoPath) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white">Error loading video.</Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-black"
      {...(isLandscape ? { edges: ['top', 'bottom'] } : {})}>
      <View
        className="flex-1 relative"
        style={{
          transform: [{ rotate: isViewRotated ? '90deg' : '0deg' }],
          ...(isViewRotated && {
            width: windowHeight,
            height: windowWidth,
            alignSelf: 'center',
          }),
        }}>
        <Video
          ref={videoRef}
          source={{
            uri: videoPath,
            bufferConfig: _bufferConfig,  
          }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
          controls={true}
          paused={isPaused}
          muted={isMuted}
          onError={() => {
            if (videoPath?.startsWith('file://')) {
              setVideoPath(url);
            }
          }}
          onLoad={onLoad}
          onProgress={onProgress}
          onEnd={() => {
            setHasEnded(true);
            setIsPaused(true);
          }}
        />
      </View>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
        }}>
        <View
          style={
            isViewRotated
              ? {
                position: 'absolute',
                top: 30,
                right: 30,
                zIndex: 20,
                transform: [{ rotate: '90deg' }],
              }
              : {
                position: 'absolute',
                top: 50,
                left: 20,
                zIndex: 20,
              }
          }>
          <Button
            variant="secondary"
            size="icon"
            onPress={() => navigation.goBack()}
            className="mr-4">
            <ArrowLeftIcon className="text-foreground" size={24} />
          </Button>
        </View>

        <View
          style={
            isViewRotated
              ? {
                position: 'absolute',
                width: windowHeight,
                height: windowWidth,
                left: (windowWidth - windowHeight) / 2,
                top: (windowHeight - windowWidth) / 2,
                transform: [{ rotate: '90deg' }],
                justifyContent: 'flex-end',
                zIndex: 10,
              }
              : {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10,
              }
          }>
          <View
            className={`flex-row bg-black/80 items-center ${isViewRotated ? 'px-10 py-2' : 'px-4 py-6'
              }`}>
            <Button
              size="icon"
              variant="ghost"
              onPress={togglePlayPause}
              className="mr-2">
              {isPaused ? (
                <PlayIcon className="text-white" size={isLandscape ? 16 : 20} />
              ) : (
                <PauseIcon
                  className="text-white"
                  size={isLandscape ? 16 : 20}
                />
              )}
            </Button>
            <Text
              className={`text-white ${isLandscape ? 'text-xs' : 'text-xs'}`}>
              {`${formatTime(currentTime)} / ${formatTime(duration)}`}
            </Text>

            <TouchableOpacity
              className="flex-1 mx-4"
              activeOpacity={1}
              onPress={e => {
                const axisSize = isLandscape
                  ? progressBarHeight || progressBarWidth
                  : progressBarWidth;
                if (!axisSize || duration <= 0) { return; }
                const pointer = isLandscape
                  ? (e.nativeEvent as any).locationY ?? e.nativeEvent.locationX
                  : e.nativeEvent.locationX;
                const progress = Math.max(0, Math.min(1, pointer / axisSize));
                handleSeek(progress);
              }}
              onLayout={e => {
                setProgressBarWidth(e.nativeEvent.layout.width);
                setProgressBarHeight(e.nativeEvent.layout.height);
              }}>
              <View
                className={`${isLandscape ? 'h-0.5' : 'h-1'
                  } bg-white/30 rounded`}>
                <View
                  className={`${isLandscape ? 'h-0.5' : 'h-full'
                    } bg-white rounded`}
                  style={{
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0
                      }%`,
                  }}
                />
              </View>
            </TouchableOpacity>

            <Button size="icon" variant="ghost" onPress={toggleMute}>
              {isMuted ? (
                <VolumeOffIcon
                  className="text-white"
                  size={isLandscape ? 16 : 20}
                />
              ) : (
                <Volume2Icon
                  className="text-white"
                  size={isLandscape ? 16 : 20}
                />
              )}
            </Button>

            <Button size="icon" variant="ghost" onPress={toggleViewRotation}>
              <Repeat2Icon className="text-white" size={16} />
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
};
