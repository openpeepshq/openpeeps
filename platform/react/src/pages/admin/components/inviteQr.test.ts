import { describe, expect, it } from 'vitest';
import type { CommunityConfig } from '@openpeepshq/common/types';
import {
  communityQrLogoSrc,
  inviteQrDataUrl,
  inviteQrFilename,
  inviteUrl,
} from './inviteQr';

describe('inviteUrl', () => {
  it('points at the invitation signup page with the slug', () => {
    expect(inviteUrl('abc123')).toContain(
      '/auth/register/invitation?inviteCode=abc123',
    );
  });
});

describe('inviteQrFilename', () => {
  it('names the download after the invite slug', () => {
    expect(inviteQrFilename('abc123')).toBe('invite-abc123.png');
  });
});

describe('communityQrLogoSrc', () => {
  const theme = {
    base: 'OpenpeepsLight',
    icon: '/img/icon.svg',
    light: { primaryHex: '#15678a', logoSmall: '/img/logo-small.png' },
    dark: { primaryHex: '#15678a', logoSmall: '/img/logo-small-white.png' },
  };

  it('prefers the light-background logo', () => {
    expect(communityQrLogoSrc({ theme } as CommunityConfig)).toBe(
      '/img/logo-small.png',
    );
  });

  it('falls back to the community icon', () => {
    expect(
      communityQrLogoSrc({
        theme: {
          ...theme,
          light: { primaryHex: '#15678a' },
          dark: { primaryHex: '#15678a' },
        },
      } as CommunityConfig),
    ).toBe('/img/icon.svg');
  });
});

describe('inviteQrDataUrl', () => {
  it('encodes the invite URL as a PNG data URL', async () => {
    const url = inviteUrl('abc123');
    const dataUrl = await inviteQrDataUrl(url);
    expect(dataUrl.startsWith('data:image/png')).toBe(true);
  });
});
