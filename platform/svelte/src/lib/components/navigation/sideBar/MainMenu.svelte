<script lang="ts">
  import {
    Home,
    Newspaper,
    PhoneCall,
    Bolt,
    MessageSquareText,
    DatabaseBackup,
    Settings,
    Users,
    ShieldAlert,
    CalendarDays,
    BookUser,
    User,
    ChartLine,
    Wrench,
    Stethoscope,
    MailOpen,
    Search,
    ScrollText,
    Bookmark,
    BookCheck,
    LogOut,
    KeyRound,
    Logs,
  } from 'lucide-svelte';
  import { TreeView } from '@skeletonlabs/skeleton';
  import { currentProfileStore } from '$lib/api';
  import {
    getVisibleAdminSections,
    type AdminSectionKey,
  } from '@openpeeps/common/lib';
  import type { IconType } from '@openpeeps/ui';
  import { page } from '$app/state';
  import { MenuItem } from '.';
  import { i18nContext } from '$lib/components/i18n';
  import { getServerInfo } from '@openpeeps/svelte/server';
  import { handleLogout } from '$lib/utils/handleLogout';

  const { t } = i18nContext();
  const profileQuery = currentProfileStore();

  const adminSectionIcons: Record<AdminSectionKey, IconType> = {
    members: User,
    groups: Users,
    invites: MailOpen,
    moderation: ShieldAlert,
    backups: DatabaseBackup,
    analytics: ChartLine,
    logs: Logs,
    apiKeys: KeyRound,
    configuration: Wrench,
    diagnostics: Stethoscope,
  };

  const adminSectionLabels: Record<AdminSectionKey, () => string> = {
    members: () => t('navigation.members'),
    groups: () => t('navigation.groups'),
    invites: () => t('navigation.invites'),
    moderation: () => t('navigation.moderation'),
    backups: () => t('navigation.backups'),
    analytics: () => t('navigation.analytics'),
    logs: () => t('navigation.logs'),
    apiKeys: () => t('navigation.apiKeys'),
    configuration: () => t('navigation.configuration'),
    diagnostics: () => t('navigation.diagnostics'),
  };

  let visibleAdminSections = $derived(
    getVisibleAdminSections($profileQuery.data?.roles),
  );
  let showAdminMenu = $derived(visibleAdminSections.length > 0);
  let isAdministrationOpen = $derived(page.url.pathname.includes('/admin'));

  const serverInfo = getServerInfo();
</script>

<TreeView padding="py-4 pr-4" caretClosed="hidden" caretOpen="hidden">
  <MenuItem name={t('navigation.community')} icon={Home} action="/feeds/local" />
  <MenuItem
    name={t('navigation.goToWelcomePage')}
    icon={BookCheck}
    action="/welcome"
  />
  <MenuItem name={t('navigation.explore')} icon={Search} action="/explore" />
  <MenuItem name={t('navigation.myFeed')} icon={Newspaper} action="/feeds/my" />
  {#if serverInfo.jams.livekit.enabled}
    <MenuItem name={t('navigation.jams')} icon={PhoneCall} action="/jams" />
  {/if}
  <MenuItem name={t('navigation.groups')} icon={Users} action="/groups" />
  <MenuItem name={t('navigation.events')} icon={CalendarDays} action="/events" />
  <MenuItem
    name={t('navigation.articles')}
    icon={ScrollText}
    action="/articles"
  />
  <MenuItem
    name={t('navigation.messages')}
    icon={MessageSquareText}
    action="/conversations"
  />
  <MenuItem name={t('navigation.members')} icon={BookUser} action="/members" />
  <MenuItem
    name={t('navigation.bookmarks')}
    icon={Bookmark}
    action="/feeds/bookmarks"
  />
  <MenuItem name={t('navigation.settings')} icon={Settings} action="/settings" />

  {#if showAdminMenu}
    <MenuItem
      name={t('navigation.administration')}
      icon={Bolt}
      action="/admin"
      open={isAdministrationOpen}
    >
      {#snippet children()}
        {#each visibleAdminSections as section (section.key)}
          <MenuItem
            name={adminSectionLabels[section.key]()}
            icon={adminSectionIcons[section.key]}
            action={section.path}
          />
        {/each}
      {/snippet}
    </MenuItem>
  {/if}
  <MenuItem
    name={t('navigation.logOut')}
    icon={LogOut}
    action={handleLogout}
    danger
  />
</TreeView>
