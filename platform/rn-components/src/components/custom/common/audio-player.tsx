import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import Sound from 'react-native-sound';
import Slider from '@react-native-community/slider';
import {
  PlayIcon,
  PauseIcon,
  Volume2Icon,
  VolumeOffIcon,
} from '~/components/icons';

interface AudioPlayerProps {
  uri: string;
  isActive: boolean;
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) {return '0:00';}
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({uri, isActive}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Sound | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSeekingRef = useRef(false);

  useEffect(() => {
    Sound.setCategory('Playback');

    if (!uri) {
      setError('No audio URI provided.');
      setIsLoading(false);
      return;
    }

    const sound = new Sound(uri, '', err => {
      if (err) {
        console.error('Failed to load sound', err);
        setError('Failed to load audio.');
        setIsLoading(false);
        return;
      }

      soundRef.current = sound;
      setDuration(sound.getDuration());
      setIsLoading(false);
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.release();
      }
      clearInterval(progressIntervalRef.current!);
    };
  }, [uri]);

  useEffect(() => {
    if (!isActive && isPlaying) {
      soundRef.current?.pause();
      setIsPlaying(false);
      clearInterval(progressIntervalRef.current!);
    }
  }, [isActive, isPlaying]);

  useEffect(() => {
    if (isPlaying && !isSeekingRef.current) {
      progressIntervalRef.current = setInterval(() => {
        soundRef.current?.getCurrentTime(seconds => {
          setCurrentTime(seconds);
        });
      }, 1000);
    } else {
      clearInterval(progressIntervalRef.current!);
    }

    return () => clearInterval(progressIntervalRef.current!);
  }, [isPlaying]);

  const togglePlayPause = () => {
    if (error || isLoading) {return;}
    const sound = soundRef.current;
    if (!sound) {return;}

    if (isPlaying) {
      sound.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= duration && duration > 0) {
        sound.setCurrentTime(0);
      }

      sound.play(success => {
        if (success) {
          setIsPlaying(false);
          setCurrentTime(duration);
        } else {
          setError('Playback failed.');
          setIsPlaying(false);
        }
      });

      setIsPlaying(true);
    }
  };

  const handleSeek = () => {
    isSeekingRef.current = true;
  };

  const onSlidingComplete = (value: number) => {
    const sound = soundRef.current;
    if (!sound) {return;}

    sound.setCurrentTime(value);
    setTimeout(() => {
      sound.getCurrentTime(seconds => {
        setCurrentTime(seconds);
      });
      isSeekingRef.current = false;
    }, 300);
  };

  const toggleMute = () => {
    const sound = soundRef.current;
    if (!sound) {return;}

    if (isMuted) {
      sound.setVolume(1);
      setIsMuted(false);
    } else {
      sound.setVolume(0);
      setIsMuted(true);
    }
  };

  if (isLoading) {
    return (
      <View className="w-[90vw] h-[140px] rounded-xl self-center justify-center items-center bg-black/50">
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text className="text-white mt-2.5">Loading audio...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="w-[90vw] h-[140px] rounded-xl self-center justify-center items-center bg-black/50">
        <Text className="text-white text-base">{error}</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('~/assets/images/audio-container.png')}
      className="w-full h-full overflow-hidden self-center"
      resizeMode="cover">
      <View className="absolute bottom-0 left-0 right-0 h-[60px] flex-row items-center px-2.5 bg-black/20">
        <TouchableOpacity onPress={togglePlayPause} className="p-2.5">
          {isPlaying ? (
            <PauseIcon className="text-white" />
          ) : (
            <PlayIcon className="text-white" />
          )}
        </TouchableOpacity>

        <Text className="text-white text-sm min-w-[40px] mx-1 text-center">
          {formatTime(currentTime)}
        </Text>

        <Slider
          style={{flex: 1, height: 40}}
          minimumValue={0}
          maximumValue={duration}
          value={currentTime}
          onValueChange={handleSeek}
          onSlidingComplete={onSlidingComplete}
          minimumTrackTintColor="#FFFFFF"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#FFFFFF"
        />

        <TouchableOpacity onPress={toggleMute} className="p-2.5">
          {isMuted ? (
            <VolumeOffIcon className="text-white" />
          ) : (
            <Volume2Icon className="text-white" />
          )}
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};
