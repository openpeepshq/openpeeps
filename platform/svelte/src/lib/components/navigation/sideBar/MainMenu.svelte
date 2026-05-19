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
  } from 'lucide-svelte';
  import { TreeView } from '@skeletonlabs/skeleton';
  import { currentProfileStore } from '$lib/api';
  import { checkRoleCapabilities } from '@openpeeps/common/lib';
  import { page } from '$app/state';
  import { MenuItem } from '.';
  import { i18nContext } from '$lib/components/i18n';
  import { getServerInfo } from '@openpeeps/svelte/server';
	import { handleLogout } from '$lib/utils/handleLogout';

  const { t } = i18nContext();
  const profileQuery = currentProfileStore();
  let isAdmin: boolean = $derived(
    checkRoleCapabilities(['admin'], $profileQuery.data?.roles ?? []).success,
  );
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

  {#if isAdmin}
    <MenuItem
      name={t('navigation.administration')}
      icon={Bolt}
      action="/admin"
      open={isAdministrationOpen}
    >
      {#snippet children()}
        <MenuItem
          name={t('navigation.members')}
          icon={User}
          action="/admin/members"
        />
        <MenuItem
          name={t('navigation.groups')}
          icon={Users}
          action="/admin/groups"
        />
        <MenuItem
          name={t('navigation.invites')}
          icon={MailOpen}
          action="/admin/invites"
        />
        <MenuItem
          name={t('navigation.moderation')}
          icon={ShieldAlert}
          action="/admin/moderation"
        />
        <MenuItem
          name={t('navigation.backups')}
          icon={DatabaseBackup}
          action="/admin/backups"
        />
        <MenuItem
          name={t('navigation.analytics')}
          icon={ChartLine}
          action="/admin/analytics"
        />
        <MenuItem
          name={t('navigation.configuration')}
          icon={Wrench}
          action="/admin/configuration"
        />
        <MenuItem
          name={t('navigation.diagnostics')}
          icon={Stethoscope}
          action="/admin/diagnostics"
        />
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
