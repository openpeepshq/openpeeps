import { getTheme } from '@openpeepshq/common';
import { useCurrentProfileSettings } from '../components/layout/IdentityContext';
import {
  firstMarkdownImage,
  welcomePreviewExcerpt,
} from '../components/preview-link/helpers';
import { useServerInfo } from '../components/server-data/context';
import { useT } from '../i18n/context';

export type WelcomePreviewContent = {
  /** Short label above the title. Omitted when it would repeat the title. */
  eyebrow?: string;
  title: string;
  /** Plain-text excerpt (image-stripped) for non-markdown consumers / fallback. */
  description: string;
  /** Raw welcome markdown (image-bearing) for markdown rendering + overlays. */
  markdown: string;
  imageUrl?: string;
  imageFit: 'cover' | 'contain';
};

/**
 * Shared welcome-link card. Native passes the device color scheme because
 * `getTheme` cannot read it from `window` there.
 */
export const useWelcomePreview = (
  systemScheme?: 'dark' | 'light',
): WelcomePreviewContent => {
  const t = useT();
  const serverInfo = useServerInfo();
  const profileSettings = useCurrentProfileSettings();
  const config = serverInfo.communityConfig;
  const configured = config.content.welcomePage?.trim() ?? '';
  const markdownImage = firstMarkdownImage(configured);
  const logo = (
    systemScheme
      ? getTheme(config, profileSettings, systemScheme)
      : getTheme(config, profileSettings)
  ).logoSmall;
  const label = t('welcome.previewLabel', { defaultValue: 'Welcome page' });
  const name = config.info.name.trim();
  const title = name
    ? t('welcome.heading', {
        name,
        defaultValue: 'Welcome to {{name}}',
      })
    : label;

  return {
    eyebrow: title === label ? undefined : label,
    title,
    description: configured
      ? welcomePreviewExcerpt(configured)
      : t('welcome.defaultIntro', {
          defaultValue: 'Welcome to this community, hosted on AllPeep.',
        }),
    markdown: configured,
    imageUrl: markdownImage || logo || undefined,
    imageFit: markdownImage ? 'cover' : 'contain',
  };
};
