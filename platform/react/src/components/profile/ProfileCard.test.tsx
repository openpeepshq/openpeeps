/** @vitest-environment jsdom */
/**
 * Pins the federated-handle line in the web ProfileCard: a profile carrying
 * `activityPub.domain` renders `@handle@domain` (both as the name fallback and
 * the handle line), while a local profile keeps the bare `@handle`. The RN
 * mirror (platform/rn-components/.../ProfileCard.test.tsx) pins the same
 * branch from the native side.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { PublicProfile } from '@openpeepshq/common/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@openpeepshq/common/lib', () => ({
  // The card only needs the bio collapsed to plain text; a passthrough keeps
  // this test independent of the built @openpeepshq/common dist.
  markdownPlainText: (text?: string) => text ?? '',
}));

vi.mock('./Avatar', () => ({
  Avatar: ({ profile }: { profile: PublicProfile }) =>
    createElement('img', { 'data-testid': 'card-avatar', alt: profile.handle }),
}));

vi.mock('./FollowUnfollowButton', () => ({
  FollowUnfollowButton: () =>
    createElement('button', { 'data-testid': 'card-follow' }),
}));

import { ProfileCard } from './ProfileCard';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const makeProfile = (handle: string, activityPub?: { domain: string }) =>
  ({
    id: `p-${handle}`,
    handle,
    displayName: '',
    avatar: null,
    bio: null,
    activityPub,
  }) as unknown as PublicProfile;

describe('ProfileCard federated handle line (issue #279)', () => {
  let root: Root;
  let container: HTMLDivElement;

  const renderCard = (profile: PublicProfile) => {
    act(() => {
      root.render(createElement(ProfileCard, { profile, showAction: false }));
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders @handle@domain for a federated profile', () => {
    renderCard(makeProfile('alice', { domain: 'mastodon.social' }));
    const handleLine = Array.from(container.querySelectorAll('span')).find(
      (el) => el.textContent === '@alice@mastodon.social',
    );
    expect(handleLine, 'federated handle line was rendered').toBeTruthy();
  });

  it('uses @handle@domain as the name fallback when there is no display name', () => {
    renderCard(makeProfile('alice', { domain: 'mastodon.social' }));
    const nameLine = Array.from(container.querySelectorAll('span')).find((el) =>
      el.className.includes('font-semibold'),
    );
    expect(nameLine?.textContent).toBe('@alice@mastodon.social');
  });

  it('keeps the bare @handle for a local profile (name fallback + handle line)', () => {
    renderCard(makeProfile('bob'));
    const handleSpans = Array.from(container.querySelectorAll('span')).filter(
      (el) => el.textContent === '@bob',
    );
    // Name fallback (no display name) and handle line both use `@bob` —
    // with no `activityPub.domain` nothing may be appended to it.
    expect(handleSpans).toHaveLength(2);
  });
});
