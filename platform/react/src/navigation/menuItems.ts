import type { NavItemDef, NavTarget } from './targets';

export type MainMenuCapabilities = {
  jamsEnabled: boolean;
  showAdmin: boolean;
};

const navTooltip = (id: string) => `navigation.tooltips.${id}` as const;

/** Default main-menu targets for hosts to render with their own icons/labels. */
export const buildMainNavItems = (caps: MainMenuCapabilities): NavItemDef[] => {
  const items: NavItemDef[] = [
    {
      id: 'community',
      target: { type: 'feed', feed: 'local' },
      labelKey: 'navigation.community',
      tooltipKey: navTooltip('community'),
      icon: 'Home',
    },
    {
      id: 'welcome',
      target: { type: 'welcome' },
      labelKey: 'navigation.goToWelcomePage',
      tooltipKey: navTooltip('welcome'),
      icon: 'BookCheck',
    },
    {
      id: 'explore',
      target: { type: 'explore' },
      labelKey: 'navigation.explore',
      tooltipKey: navTooltip('explore'),
      icon: 'Search',
    },
    {
      id: 'myFeed',
      target: { type: 'feed', feed: 'my' },
      labelKey: 'navigation.myFeed',
      tooltipKey: navTooltip('myFeed'),
      icon: 'Newspaper',
    },
  ];
  if (caps.jamsEnabled) {
    items.push({
      id: 'jams',
      target: { type: 'jams' },
      labelKey: 'navigation.jams',
      tooltipKey: navTooltip('jams'),
      icon: 'PhoneCall',
    });
  }
  items.push(
    {
      id: 'groups',
      target: { type: 'groups' },
      labelKey: 'navigation.groups',
      tooltipKey: navTooltip('groups'),
      icon: 'Users',
    },
    {
      id: 'events',
      target: { type: 'events' },
      labelKey: 'navigation.events',
      tooltipKey: navTooltip('events'),
      icon: 'CalendarDays',
    },
    {
      id: 'articles',
      target: { type: 'articles' },
      labelKey: 'navigation.articles',
      tooltipKey: navTooltip('articles'),
      icon: 'ScrollText',
    },
    {
      id: 'resources',
      target: { type: 'resources' },
      labelKey: 'navigation.resources',
      tooltipKey: navTooltip('resources'),
      icon: 'Library',
    },
    {
      id: 'messages',
      target: { type: 'conversation' },
      labelKey: 'navigation.messages',
      tooltipKey: navTooltip('messages'),
      icon: 'MessageSquareText',
    },
    {
      id: 'members',
      target: { type: 'members' },
      labelKey: 'navigation.members',
      tooltipKey: navTooltip('members'),
      icon: 'BookUser',
    },
    {
      id: 'bookmarks',
      target: { type: 'feed', feed: 'bookmarks' },
      labelKey: 'navigation.bookmarks',
      tooltipKey: navTooltip('bookmarks'),
      icon: 'Bookmark',
    },
    {
      id: 'settings',
      target: { type: 'settings' },
      labelKey: 'navigation.settings',
      tooltipKey: navTooltip('settings'),
      icon: 'Settings',
    },
  );
  if (caps.showAdmin) {
    items.push({
      id: 'admin',
      target: { type: 'admin' },
      labelKey: 'navigation.administration',
      tooltipKey: navTooltip('administration'),
      icon: 'Bolt',
    });
  }
  return items;
};

export const isSameNavTarget = (a: NavTarget, b: NavTarget): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
