export const CONFIGURATION_PLUGIN_SLOT_PREFIX = 'plugins.admin.configuration.';

const RESERVED_CONFIGURATION_SLUGS = new Set([
  'community',
  'email',
  'i18n',
  'server',
  'server-settings',
]);

const PLUGIN_PAGE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const configurationPluginSlotName = (slug: string) =>
  `${CONFIGURATION_PLUGIN_SLOT_PREFIX}${slug}`;

export const configurationPluginPageSlug = (slot: string) => {
  if (!slot.startsWith(CONFIGURATION_PLUGIN_SLOT_PREFIX)) return null;
  const slug = slot.slice(CONFIGURATION_PLUGIN_SLOT_PREFIX.length);
  if (!PLUGIN_PAGE_SLUG.test(slug) || RESERVED_CONFIGURATION_SLUGS.has(slug)) {
    return null;
  }
  return slug;
};

export const humanizeConfigurationPluginSlug = (slug: string) =>
  slug
    .split('-')
    .map((part) =>
      part.length <= 2
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ');
