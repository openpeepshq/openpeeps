import {
  encodeNavRedirect,
  type Navigator,
  type NavTarget,
} from '@openpeepshq/react';

const groupPath = (handle: string) =>
  handle.startsWith('@') ? `/groups/${handle}` : `/groups/@${handle}`;

/**
 * Maps {@link NavTarget} values to the current OpenPeeps web path scheme.
 */
export const createWebNavigator = (): Navigator => ({
  hrefOf: (target) => {
    switch (target.type) {
      case 'home':
        return '/';
      case 'welcome':
        return '/welcome';
      case 'explore':
        return '/explore';
      case 'feed':
        return `/feeds/${target.feed}`;
      case 'profile': {
        const base = target.handle.startsWith('@')
          ? `/${target.handle}`
          : `/@${target.handle}`;
        if (target.tab === 'followers') return `${base}/followers`;
        if (target.tab === 'following') return `${base}/following`;
        return base;
      }
      case 'post':
        return `/posts/${target.id}`;
      case 'postNew':
        return '/posts/new';
      case 'group': {
        if (!target.handle) return '/groups';
        const base = groupPath(target.handle);
        if (target.view === 'info') return `${base}/info`;
        if (target.view === 'edit') return `${base}/edit`;
        if (target.view === 'edit-info') return `${base}/edit/info`;
        if (target.view === 'edit-roles') return `${base}/edit/roles`;
        if (target.view === 'members') return `${base}/members`;
        return base;
      }
      case 'groups':
        return target.view === 'new' ? '/groups/new' : '/groups';
      case 'conversation': {
        if (target.view === 'new') return '/conversations/new';
        if (!target.id) return '/conversations';
        if (target.view === 'info') return `/conversations/${target.id}/info`;
        return `/conversations/${target.id}`;
      }
      case 'jam':
        if (target.view === 'event' && target.id)
          return `/events/${target.id}/jam`;
        return target.id ? `/jams/${target.id}` : '/jams';
      case 'jams':
        return target.view === 'my' ? '/jams/my' : '/jams';
      case 'events': {
        if (target.view === 'my') return '/events/my';
        if (target.view === 'new') return '/events/new';
        if (target.eventId) return `/events/${target.eventId}/edit`;
        return '/events';
      }
      case 'articles': {
        if (target.view === 'new') return '/articles/new';
        if (target.articleId) return `/articles/${target.articleId}/edit`;
        return '/articles';
      }
      case 'members':
        return '/members';
      case 'notifications':
        return '/notifications';
      case 'tags':
        return `/tags/${encodeURIComponent(target.hashtag)}`;
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
        return `${path}?redirect=${encodeNavRedirect(target.redirect)}`;
      }
      case 'admin': {
        if (!target.section) return '/admin';
        if (target.section === 'groups' && target.handle)
          return `/admin/groups/@${target.handle.replace(/^@/, '')}/members`;
        return `/admin/${target.section}`;
      }
      case 'settings':
        return target.section ? `/settings/${target.section}` : '/settings';
      case 'about':
        return '/about';
      case 'codeOfConduct':
        return '/code-of-conduct';
      case 'docs':
        return target.path ? `/docs/${target.path}` : '/docs';
      case 'paymentSuccess':
        return '/payment/success';
      case 'external':
        return target.href;
      case 'path':
        return target.path;
      default: {
        const _exhaustive: never = target;
        return _exhaustive;
      }
    }
  },

  match: (pathname) => {
    if (pathname === '/' || pathname === '/home') return { type: 'home' };
    if (pathname === '/welcome') return { type: 'welcome' };
    if (pathname === '/explore') return { type: 'explore' };
    if (pathname === '/feeds/local') return { type: 'feed', feed: 'local' };
    if (pathname === '/feeds/my') return { type: 'feed', feed: 'my' };
    if (pathname === '/feeds/bookmarks')
      return { type: 'feed', feed: 'bookmarks' };
    if (pathname === '/notifications') return { type: 'notifications' };
    if (pathname === '/groups') return { type: 'groups' };
    if (pathname === '/groups/new') return { type: 'groups', view: 'new' };
    if (pathname === '/jams') return { type: 'jams' };
    if (pathname === '/jams/my') return { type: 'jams', view: 'my' };
    if (pathname === '/events') return { type: 'events' };
    if (pathname === '/events/my') return { type: 'events', view: 'my' };
    if (pathname === '/events/new') return { type: 'events', view: 'new' };
    if (pathname === '/articles') return { type: 'articles' };
    if (pathname === '/articles/new') return { type: 'articles', view: 'new' };
    if (pathname === '/conversations') return { type: 'conversation' };
    if (pathname === '/conversations/new')
      return { type: 'conversation', view: 'new' };
    if (pathname === '/members') return { type: 'members' };
    if (pathname === '/settings') return { type: 'settings' };
    if (pathname.startsWith('/settings/'))
      return { type: 'settings', section: pathname.slice('/settings/'.length) };
    if (pathname === '/admin') return { type: 'admin' };
    if (pathname.startsWith('/admin/'))
      return { type: 'admin', section: pathname.slice('/admin/'.length) };
    if (pathname === '/auth/login') return { type: 'auth', mode: 'login' };
    if (pathname === '/auth/register')
      return { type: 'auth', mode: 'register' };
    if (pathname.startsWith('/posts/'))
      return { type: 'post', id: pathname.slice('/posts/'.length) };
    if (pathname.startsWith('/groups/@') || pathname.startsWith('/groups/')) {
      const rest = pathname.replace(/^\/groups\/@?/, '');
      const [handle, view] = rest.split('/');
      if (!handle) return { type: 'groups' };
      return {
        type: 'group',
        handle,
        view: view as 'info' | 'edit' | 'members' | undefined,
      };
    }
    if (pathname.startsWith('/@') || /^\/[^/]+$/.test(pathname)) {
      const handle = pathname.replace(/^\//, '').replace(/^@/, '');
      if (
        [
          'about',
          'explore',
          'welcome',
          'members',
          'notifications',
          'jams',
          'events',
          'articles',
          'groups',
          'conversations',
          'settings',
          'admin',
          'docs',
          'feeds',
          'posts',
          'auth',
          'tags',
          'payment',
          'plugins',
          'test',
          'home',
        ].includes(handle)
      ) {
        return null;
      }
      return { type: 'profile', handle };
    }
    return null;
  },
});
