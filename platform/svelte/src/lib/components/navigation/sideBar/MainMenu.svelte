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
    MailOpen,
    Logs,
    Search,
    ScrollText,
    Bookmark,
  } from 'lucide-svelte';
  import { TreeView } from '@skeletonlabs/skeleton';
  import { currentProfileStore, unseenPostCountsStore } from '$lib/api';
  import { checkRoleCapabilities } from '@openpeeps/common/lib';
  import { page } from '$app/state';
  import { MenuItem } from '.';
  import { i18nContext } from '$lib/components/i18n';
  import { getServerInfo } from '@openpeeps/svelte/server';

  const { t } = i18nContext();
  const profileQuery = currentProfileStore();
  const unseenPostCountsQuery = unseenPostCountsStore();
  let isAdmin: boolean = $derived(checkRoleCapabilities(['admin'], $profileQuery.data?.roles ?? []).success);
  let isAdministrationOpen = $derived(page.url.pathname.includes('/admin'));
  let unseenGroupPostsCount = $derived(Object.values($unseenPostCountsQuery.data?.groups ?? {}).reduce((sum, count) => sum + count, 0));
  let unseenDirectMessagesCount = $derived($unseenPostCountsQuery.data?.direct ?? 0);

  const serverInfo = getServerInfo();
</script>

<TreeView padding="py-4 pr-4" caretClosed="hidden" caretOpen="hidden">
  <MenuItem name={t('navigation.community')} icon={Home} path="/feeds/local" />
  <MenuItem name={t('navigation.explore')} icon={Search} path="/explore" />
  <MenuItem name={t('navigation.myFeed')} icon={Newspaper} path="/feeds/my" />
  {#if serverInfo.jams.livekit.enabled}
    <MenuItem name={t('navigation.jams')} icon={PhoneCall} path="/jams" />
  {/if}
  <MenuItem
    name={t('navigation.groups')}
    icon={Users}
    path="/groups"
    count={unseenGroupPostsCount}
  />
  <MenuItem name={t('navigation.events')} icon={CalendarDays} path="/events" />
  <MenuItem
    name={t('navigation.articles')}
    icon={ScrollText}
    path="/articles"
  />
  <MenuItem
    name={t('navigation.messages')}
    icon={MessageSquareText}
    path="/conversations"
    count={unseenDirectMessagesCount}
  />
  <MenuItem name={t('navigation.members')} icon={BookUser} path="/members" />
  <MenuItem
    name={t('navigation.bookmarks')}
    icon={Bookmark}
    path="/feeds/bookmarks"
  />
  <MenuItem name={t('navigation.settings')} icon={Settings} path="/settings" />

  {#if isAdmin}
    <MenuItem
      name={t('navigation.administration')}
      icon={Bolt}
      path="/admin"
      open={isAdministrationOpen}
    >
      {#snippet children()}
        <MenuItem
          name={t('navigation.members')}
          icon={User}
          path="/admin/members"
        />
        <MenuItem
          name={t('navigation.groups')}
          icon={Users}
          path="/admin/groups"
        />
        <MenuItem
          name={t('navigation.invites')}
          icon={MailOpen}
          path="/admin/invites"
        />
        <MenuItem
          name={t('navigation.moderation')}
          icon={ShieldAlert}
          path="/admin/moderation"
        />
        <MenuItem
          name={t('navigation.backups')}
          icon={DatabaseBackup}
          path="/admin/backups"
        />
        <MenuItem
          name={t('navigation.analytics')}
          icon={ChartLine}
          path="/admin/analytics"
        />
        <MenuItem name={t('navigation.logs')} icon={Logs} path="/admin/logs" />
        <MenuItem
          name={t('navigation.configuration')}
          icon={Wrench}
          path="/admin/configuration"
        />
      {/snippet}
    </MenuItem>
  {/if}
</TreeView>
