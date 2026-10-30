import { useColorScheme, View } from 'react-native';
import { useWelcomePreview } from '@openpeepshq/react';
import { stripMarkdownImages, truncateMarkdown } from '@openpeepshq/common/lib';
import { CachedImage } from '../../custom/common';
import { ThemedText } from '../../ui/themed-text';
import { toAbsoluteMediaUrl } from '../../../lib/media-url';
import { TruncatedMarkdown } from '../../post/TruncatedMarkdown';

export const WelcomePreview = () => {
  const systemColorScheme = useColorScheme();
  const systemScheme = systemColorScheme === 'dark' ? 'dark' : 'light';
  const { eyebrow, title, description, markdown, imageUrl, imageFit } =
    useWelcomePreview(systemScheme);
  const resolvedImage = toAbsoluteMediaUrl(imageUrl);

  return (
    <View
      testID="welcome-preview-card"
      className="flex w-full flex-row items-center gap-4"
    >
      {resolvedImage ? (
        <View className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md">
          <CachedImage
            url={resolvedImage}
            className="h-full w-full"
            resizeMode={imageFit}
          />
        </View>
      ) : null}
      <View className="min-w-0 flex-1 gap-1">
        {eyebrow ? (
          <ThemedText
            className="text-muted-foreground text-xs"
            numberOfLines={1}
          >
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText className="font-semibold" numberOfLines={2}>
          {title}
        </ThemedText>
        {markdown ? (
          <TruncatedMarkdown
            source={markdown}
            snippet={truncateMarkdown(stripMarkdownImages(markdown), 2, 240)}
            maxLines={2}
          />
        ) : description ? (
          <ThemedText
            className="text-muted-foreground text-sm"
            numberOfLines={3}
          >
            {description}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
};
