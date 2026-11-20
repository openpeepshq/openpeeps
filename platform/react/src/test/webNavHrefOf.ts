import type { NavTarget } from '../navigation/targets';

/**
 * Test-only mirror of `createWebNavigator().hrefOf` (the platform/web
 * target→path mapping) for the NavTarget types the components under test
 * render. Tests wire this through their `useHrefOf` mock and assert the
 * concrete href, so the mapping has exactly one source of truth instead of
 * a hand-rolled stub per test file. The default throws on an unmapped type
 * so a target the components render that this helper has not been extended
 * for fails loudly at the render site instead of silently asserting a wrong
 * href. When `platform/web/src/navigation/webNavigator.ts` changes one of
 * the paths below, update this mapping to match.
 */
export const webNavHrefOf = (target: NavTarget): string => {
  switch (target.type) {
    case 'welcome':
      return '/welcome';
    case 'about':
      return '/about';
    case 'codeOfConduct':
      return '/code-of-conduct';
    case 'members':
      return '/members';
    case 'feed':
      return `/feeds/${target.feed}`;
    case 'settings':
      return target.section ? `/settings/${target.section}` : '/settings';
    case 'docs':
      return target.path ? `/docs/${target.path}` : '/docs';
    case 'path':
      return target.path;
    case 'auth': {
      const path =
        target.mode === 'login'
          ? '/auth/login'
          : target.mode === 'register'
            ? '/auth/register'
            : target.mode === 'closed'
              ? '/auth/closed'
              : target.mode === 'validate-email'
                ? '/auth/validate-email'
                : target.mode === 'reset-password'
                  ? '/auth/reset-password'
                  : '/auth/request-reset-password';
      if (!target.redirect) return path;
      return `${path}?redirect=${encodeURIComponent(JSON.stringify(target.redirect))}`;
    }
    default:
      throw new Error(
        'unmapped nav target: ' + (target as { type: string }).type,
      );
  }
};
