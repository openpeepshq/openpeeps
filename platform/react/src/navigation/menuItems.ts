import type { NavItemDef, NavTarget } from './targets';

export type MainMenuCapabilities = {
  jamsEnabled: boolean;
  showAdmin: boolean;
};

/** Default main-menu targets for hosts to render with their own icons/labels. */
export const buildMainNavItems = (caps: MainMenuCapabilities): NavItemDef[] => {
  const items: NavItemDef[] = [
    {
      id: 'community',
      target: { type: 'feed', feed: 'local' },
      labelKey: 'navigation.community',
      icon: 'Home',
    },
    {
      id: 'welcome',
      target: { type: 'welcome' },
      labelKey: 'navigation.goToWelcomePage',
      icon: 'BookCheck',
    },
    {
      id: 'explore',
      target: { type: 'explore' },
      labelKey: 'navigation.explore',
      icon: 'Search',
    },
    {
      id: 'myFeed',
      target: { type: 'feed', feed: 'my' },
      labelKey: 'navigation.myFeed',
      icon: 'Newspaper',
    },
  ];
  if (caps.jamsEnabled) {
    items.push({
      id: 'jams',
      target: { type: 'jams' },
      labelKey: 'navigation.jams',
      icon: 'PhoneCall',
    });
  }
  items.push(
    {
      id: 'groups',
      target: { type: 'groups' },
      labelKey: 'navigation.groups',
      icon: 'Users',
    },
    {
      id: 'events',
      target: { type: 'events' },
      labelKey: 'navigation.events',
      icon: 'CalendarDays',
    },
    {
      id: 'articles',
      target: { type: 'articles' },
      labelKey: 'navigation.articles',
      icon: 'ScrollText',
    },
    {
      id: 'messages',
      target: { type: 'conversation' },
      labelKey: 'navigation.messages',
      icon: 'MessageSquareText',
    },
    {
      id: 'members',
      target: { type: 'members' },
      labelKey: 'navigation.members',
      icon: 'BookUser',
    },
    {
      id: 'bookmarks',
      target: { type: 'feed', feed: 'bookmarks' },
      labelKey: 'navigation.bookmarks',
      icon: 'Bookmark',
    },
    {
      id: 'settings',
      target: { type: 'settings' },
      labelKey: 'navigation.settings',
      icon: 'Settings',
    },
  );
  if (caps.showAdmin) {
    items.push({
      id: 'admin',
      target: { type: 'admin' },
      labelKey: 'navigation.administration',
      icon: 'Bolt',
    });
  }
  return items;
};

export const isSameNavTarget = (a: NavTarget, b: NavTarget): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
