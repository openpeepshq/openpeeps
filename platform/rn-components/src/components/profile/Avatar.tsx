import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text } from 'react-native';
import { Profile, isDeletedProfile } from '@openpeepshq/common';
import {
  getInitials,
  hueFromHandle,
  initialsBackground,
  isSvgUrl,
  svgCoverSrc,
} from '@openpeepshq/react';
import { useOpenPeepsTheme } from '../../theme/OpenPeepsThemeProvider';
import { Avatar, AvatarImage } from '../ui/avatar';
import { SvgImage } from '../ui/svg-image';
import { UserXIcon } from '../icons/index';
import { cn } from '../../lib/utils';

/** Tailwind spacing unit in dp (size-N / w-N → N × 4). */
const TAILWIND_UNIT = 4;
/** Initials and deleted-icon scale with the avatar instead of preset buckets. */
const FONT_RATIO = 0.375;
const ICON_RATIO = 0.4375;

const avatarPxFromClassName = (className?: string): number => {
  const match = className?.match(/(?:^|\s)(?:size-|w-)(\d+)(?=\s|$)/);
  return match ? Number(match[1]) * TAILWIND_UNIT : 64;
};

export const ProfileAvatar = ({
  profile,
  className,
}: {
  /** `Profile`-shaped; only `displayName`/`handle`/`avatar` are read. */
  profile: Partial<
    Pick<Profile, 'displayName' | 'handle' | 'avatar' | 'deletedAt'>
  >;
  className?: string;
}) => {
  const { t } = useTranslation();
  const { isDark } = useOpenPeepsTheme();

  const px = avatarPxFromClassName(className);
  const iconSize = Math.max(12, Math.round(px * ICON_RATIO));
  const fontSize = Math.max(10, Math.round(px * FONT_RATIO));
  const roundedClass = 'rounded-full';
  const deleted = isDeletedProfile(profile);

  // SVG-ness must come from the original URL: svgCoverSrc appends the
  // web-only #svgView cover fragment, which the RN media cache does not
  // strip — if the fragment leaked into the cache lookup the URL would miss
  // the isSvgUrl test and the SVG would silently fall back to the raster
  // path (issue #1666).
  const isSvg = !deleted && !!profile?.avatar && isSvgUrl(profile.avatar);
  const avatarSource =
    !deleted && profile?.avatar ? { uri: svgCoverSrc(profile.avatar) } : null;

  const hue = hueFromHandle(profile?.handle ?? '');
  const initialsBg = !deleted ? initialsBackground(hue, isDark) : undefined;

  // The initials tile is the underlay behind both image branches (absolutely
  // positioned to fill the avatar box): while a remote/SVG avatar is still
  // downloading — or permanently, when the media cache cannot produce the
  // file — it is the visible content, and it doubles as the standalone
  // content for no-avatar profiles. Either way every row carries sized,
  // centered content (issue #1666).
  const initialsTile = (
    <View
      className={cn(
        'absolute inset-0 flex items-center justify-center',
        roundedClass
      )}
      style={{ backgroundColor: initialsBg }}
    >
      {/* lineHeight = fontSize + no font padding make the text box exactly the
          glyph height, so items-center centers the initials on the circle —
          the default line-height/font-metric padding leaves the box taller than
          the glyphs and pushes them down (issue #1666 QA: initials avatars sit
          low while image avatars align). */}
      <Text
        className="text-foreground font-medium"
        style={{ fontSize, lineHeight: fontSize, includeFontPadding: false }}
      >
        {getInitials(profile?.displayName, profile?.handle)}
      </Text>
    </View>
  );

  const rootClassName = cn(
    'border border-muted-foreground overflow-hidden',
    roundedClass,
    className
  );

  if (deleted || !avatarSource) {
    return (
      <Avatar
        alt={t('profile.header.avatarAlt')}
        className={rootClassName}
        style={{ width: px, height: px }}
      >
        {deleted ? (
          <View
            className={cn(
              'flex h-full w-full items-center justify-center',
              roundedClass
            )}
          >
            <UserXIcon size={iconSize} className="text-muted-foreground" />
          </View>
        ) : (
          initialsTile
        )}
      </Avatar>
    );
  }

  // The image branches render the initials tile underneath the image: while
  // the media cache is still downloading (or an SVG has not reached the
  // decode-ready state) the avatar shows the same tile as no-avatar
  // profiles, so rows always carry sized, centered content (issue #1666).
  if (isSvg) {
    return (
      <Avatar
        alt={t('profile.header.avatarAlt')}
        className={rootClassName}
        style={{ width: px, height: px }}
      >
        {initialsTile}
        <SvgImage
          uri={avatarSource.uri}
          className={cn('h-full w-full', roundedClass)}
          resizeMode="cover"
        />
      </Avatar>
    );
  }

  return (
    <Avatar
      alt={t('profile.header.avatarAlt')}
      className={rootClassName}
      style={{ width: px, height: px }}
    >
      {initialsTile}
      <AvatarImage
        source={avatarSource}
        className={cn('h-full w-full', roundedClass)}
        resizeMode="cover"
      />
    </Avatar>
  );
};
