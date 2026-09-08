export const ANALYTICS_PLUGIN_SLOT_PREFIX = 'plugins.admin.analytics.';

const RESERVED_ANALYTICS_SLUGS = new Set([
  'members',
  'content',
  'engagement',
  'groups',
  'reports',
  'growth',
  'retention',
]);

const PLUGIN_TAB_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const analyticsPluginSlotName = (slug: string) =>
  `${ANALYTICS_PLUGIN_SLOT_PREFIX}${slug}`;

export const analyticsPluginTabSlug = (slot: string) => {
  if (!slot.startsWith(ANALYTICS_PLUGIN_SLOT_PREFIX)) return null;
  const slug = slot.slice(ANALYTICS_PLUGIN_SLOT_PREFIX.length);
  if (!PLUGIN_TAB_SLUG.test(slug) || RESERVED_ANALYTICS_SLUGS.has(slug)) {
    return null;
  }
  return slug;
};

export const humanizeAnalyticsPluginSlug = (slug: string) =>
  slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
