import { describe, expect, it } from 'vitest';
import { withLegacyThemeRoot } from '../legacyThemeRoot';

describe('withLegacyThemeRoot', () => {
  it('copies light-mode fields onto the theme root', () => {
    const result = withLegacyThemeRoot({
      base: 'OpenpeepsLight',
      light: {
        primaryHex: '#15678a',
        logoSmall: '/img/logo-small.png',
        defaultProfileAvatar: '/img/default-avatar.png',
        defaultGroupAvatar: '/img/default-group-avatar.svg',
        backgroundAuth: '/img/background-auth.png',
        background: '/img/background.png',
      },
      dark: { primaryHex: '#15678a' },
    });
    expect(result.primaryHex).toBe('#15678a');
    expect(result.logoSmall).toBe('/img/logo-small.png');
    expect(result.defaultProfileAvatar).toBe('/img/default-avatar.png');
    expect(result.defaultGroupAvatar).toBe('/img/default-group-avatar.svg');
    expect(result.backgroundAuth).toBe('/img/background-auth.png');
    expect(result.background).toBe('/img/background.png');
    expect(result.light.primaryHex).toBe('#15678a');
  });

  it('keeps an existing root primaryHex', () => {
    const result = withLegacyThemeRoot({
      base: 'OpenpeepsLight',
      primaryHex: '#000000',
      light: { primaryHex: '#15678a' },
      dark: { primaryHex: '#15678a' },
    });
    expect(result.primaryHex).toBe('#000000');
  });
});
