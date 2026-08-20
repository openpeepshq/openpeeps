import {Platform, useWindowDimensions} from 'react-native';

export const useWindowSize = () => {
  const {width, height} = useWindowDimensions();

  const windowWidth = width;
  const isMediumScreenOrLarger = windowWidth >= 768;

  return {
    windowWidth,
    windowHeight: height,
    isMediumScreenOrLarger,
  };
};

export const usePlatform = () => {
  const platform = Platform.OS;
  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';

  return {
    platform,
    isIOS,
    isAndroid,
  };
};
