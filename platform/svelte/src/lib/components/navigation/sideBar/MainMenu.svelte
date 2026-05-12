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
    ChevronDown,
  } from 'lucide-svelte';
  import { TreeView } from '@skeletonlabs/skeleton';
  import { currentProfileStore } from '$lib/api';
  import { hasAdminSidebarAccess } from '@openpeeps/common/lib';
  import { MenuItem } from '.';
  import { i18nContext } from '$lib/components/i18n';
  import { getServerInfo } from '@openpeeps/svelte/server';
	import { handleLogout } from '$lib/utils/handleLogout';

  const { t } = i18nContext();
  const profileQuery = currentProfileStore();
  let isAdmin: boolean = $derived(
    hasAdminSidebarAccess($profileQuery.data?.roles ?? []),
  );
  let adminMenuExpanded = $state(false);

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
    <span class="block pl-4">
      <button
        type="button"
        class="hover:bg-surface-100 text-base-200 flex w-full items-center gap-x-2 py-2 pl-2 text-left"
        onclick={() => (adminMenuExpanded = !adminMenuExpanded)}
        aria-expanded={adminMenuExpanded}
      >
        <span class="opacity-60">
          <Bolt class="mr-1 h-5 w-5" strokeWidth={2} />
        </span>
        <span class="min-w-0 flex-1 truncate opacity-60"
          >{t('navigation.administration')}</span
        >
        <ChevronDown
          class="text-base-200 h-5 w-5 shrink-0 opacity-60 transition-transform {adminMenuExpanded
            ? 'rotate-180'
            : ''}"
        />
      </button>
      {#if adminMenuExpanded}
        <div class="border-surface-300 ml-2 mt-1 flex flex-col gap-0.5 border-l pl-2">
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
          <MenuItem name={t('navigation.logs')} icon={Logs} action="/admin/logs" />
          <MenuItem name="API Keys" icon={KeyRound} action="/admin/api-keys" />
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
        </div>
      {/if}
    </span>
  {/if}
  <MenuItem
    name={t('navigation.logOut')}
    icon={LogOut}
    action={handleLogout}
    danger
  />
</TreeView>
