import { useEffect, useState } from 'react';
import { Image, View, type ImageResizeMode } from 'react-native';
import RNFS from 'react-native-fs';
import { SvgXml } from 'react-native-svg';
import { isSvgUrl } from '@openpeepshq/react';
import { useCachedMediaUri } from '../../hooks/use-cached-media-uri';

// RN Image cannot decode SVG, so .svg media renders via react-native-svg.
// The bytes flow through the shared on-disk media cache — the same avatars
// and logos repeat everywhere, so each URL is fetched only once.
//
// resizeMode maps to preserveAspectRatio exactly as web encodes it via the
// #svgView fragment (see svgCoverSrc in @openpeepshq/react).
const preserveAspectRatioFor: Record<string, string> = {
  cover: 'xMidYMid slice',
  contain: 'xMidYMid meet',
  stretch: 'none',
};

interface SvgImageProps {
  uri?: string | null;
  className?: string;
  resizeMode?: ImageResizeMode;
}

export const SvgImage = ({
  uri,
  className,
  resizeMode = 'contain',
}: SvgImageProps) => {
  // Fragments (#svgView etc.) are web-only hints; strip before fetching.
  const src = uri?.split('#')[0];
  const svg = !!src && isSvgUrl(src);
  const localPath = useCachedMediaUri(svg ? src : null);
  const [xml, setXml] = useState<string | null>(null);

  useEffect(() => {
    if (!svg) {
      return;
    }
    setXml(null);
    if (!localPath?.startsWith('file://')) {
      return;
    }
    let cancelled = false;
    void RNFS.readFile(localPath, 'utf8')
      .then((text) => {
        if (!cancelled) {
          setXml(text);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setXml(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [svg, localPath]);

  if (!src) {
    return null;
  }
  if (!svg) {
    return (
      <Image
        source={{ uri: src }}
        className={className}
        resizeMode={resizeMode}
      />
    );
  }
  if (!xml) {
    return null;
  }
  return (
    <View className={className}>
      <SvgXml
        xml={xml}
        width="100%"
        height="100%"
        preserveAspectRatio={
          preserveAspectRatioFor[resizeMode] ?? 'xMidYMid meet'
        }
      />
    </View>
  );
};
