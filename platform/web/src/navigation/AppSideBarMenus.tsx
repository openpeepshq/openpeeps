import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Blocks,
  Bolt,
  BookCheck,
  Bookmark,
  BookUser,
  CalendarDays,
  ChartLine,
  ChevronDown,
  DatabaseBackup,
  Images,
  Database,
  Home,
  KeyRound,
  LayoutDashboard,
  Library,
  LogOut,
  MailOpen,
  MessageSquareText,
  Newspaper,
  PhoneCall,
  ScrollText,
  Search,
  Settings,
  ShieldAlert,
  Stethoscope,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  useAdminRoles,
  useOpenpeeps,
  subscribePushNotifications,
  useT,
} from '@openpeepshq/react';
import {
  NavWithTooltip,
  sideBarNavLinkClass,
  useCurrentProfile,
  useServerInfo,
  useSidebarNavClose,
} from '@openpeepshq/react/components';
import { TooltipProvider } from '@openpeepshq/react-ui';
import {
  formatBadgeCount,
  getVisibleAdminSections,
  type AdminSectionKey,
} from '@openpeepshq/common/lib';
import { createWebNavigator } from './webNavigator';

const webNavigator = createWebNavigator();
const href = webNavigator.hrefOf;
const adminSectionIcons: Record<AdminSectionKey, LucideIcon> = {
  members: User,
  groups: Users,
  invites: MailOpen,
  moderation: ShieldAlert,
  backups: DatabaseBackup,
  media: Images,
  analytics: ChartLine,
  apiKeys: KeyRound,
  plugins: Blocks,
  configuration: Wrench,
  diagnostics: Stethoscope,
  database: Database,
};

const adminSectionLabelKeys: Record<AdminSectionKey, string> = {
  members: 'navigation.members',
  groups: 'navigation.groups',
  invites: 'navigation.invites',
  moderation: 'navigation.moderation',
  backups: 'navigation.backups',
  media: 'navigation.media',
  analytics: 'navigation.analytics',
  apiKeys: 'navigation.apiKeys',
  plugins: 'navigation.plugins',
  configuration: 'navigation.configuration',
  diagnostics: 'navigation.diagnostics',
  database: 'navigation.database',
};

const adminSectionTooltipKeys: Record<AdminSectionKey, string> = {
  members: 'navigation.tooltips.members',
  groups: 'navigation.tooltips.groups',
  invites: 'navigation.tooltips.invites',
  moderation: 'navigation.tooltips.moderation',
  backups: 'navigation.tooltips.backups',
  media: 'navigation.tooltips.media',
  analytics: 'navigation.tooltips.analytics',
  apiKeys: 'navigation.tooltips.apiKeys',
  plugins: 'navigation.tooltips.plugins',
  configuration: 'navigation.tooltips.configuration',
  diagnostics: 'navigation.tooltips.diagnostics',
  database: 'navigation.tooltips.database',
};

function NavItem({
  to,
  end,
  icon: Icon,
  children,
  pill,
  tooltip,
}: {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  children: ReactNode;
  pill?: number;
  tooltip?: string;
}) {
  const closeDrawer = useSidebarNavClose();
  const link = (
    <NavLink
      to={to}
      end={end}
      className={sideBarNavLinkClass}
      onClick={() => closeDrawer?.()}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {pill != null && pill > 0 ? (
        <span className="bg-destructive text-destructive-foreground flex size-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-xs font-semibold">
          {formatBadgeCount(pill)}
        </span>
      ) : null}
    </NavLink>
  );
  if (!tooltip) return link;
  return <NavWithTooltip label={tooltip}>{link}</NavWithTooltip>;
}

function NavButton({
  icon: Icon,
  children,
  onClick,
  danger,
  tooltip,
}: {
  icon: LucideIcon;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  tooltip?: string;
}) {
  const closeDrawer = useSidebarNavClose();
  const button = (
    <button
      type="button"
      title={tooltip}
      className={[
        'hover:bg-surface flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm',
        danger ? 'text-destructive' : '',
      ].join(' ')}
      onClick={() => {
        closeDrawer?.();
        onClick();
      }}
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </button>
  );
  if (!tooltip) return button;
  return <NavWithTooltip label={tooltip}>{button}</NavWithTooltip>;
}

/** Main nav links for the signed-in sidebar (parity with Svelte `MainMenu.svelte`). */
export function AppSideBarMainMenu() {
  const t = useT();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const jamsEnabled = serverInfo.jams.livekit.enabled;
  const unseenCounts = openpeepsApi.useUnseenPostCounts();
  const unreadGroupPosts = Object.values(
    unseenCounts.data?.groups ?? {},
  ).reduce((sum, count) => sum + count, 0);
  const unreadConversationThreads = Object.keys(
    unseenCounts.data?.direct ?? {},
  ).length;

  const visibleAdminSections = getVisibleAdminSections(useAdminRoles());
  const showAdminMenu = visibleAdminSections.length > 0;

  // Mirror Svelte MainMenu: auto-expand the admin section while on /admin.
  const { pathname } = useLocation();
  const onAdminRoute = pathname.includes('/admin');
  const [adminExpanded, setAdminExpanded] = useState(onAdminRoute);
  useEffect(() => {
    if (onAdminRoute) setAdminExpanded(true);
  }, [onAdminRoute]);

  const adminToggleLabel = t('navigation.tooltips.administration');

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        aria-label={t('navigation.primary', { defaultValue: 'Primary' })}
        className="flex flex-col gap-0.5 py-2 pr-2"
      >
        <NavItem
          to={href({ type: 'feed', feed: 'local' })}
          icon={Home}
          tooltip={t('navigation.tooltips.community')}
        >
          {t('navigation.community')}
        </NavItem>
        <NavItem
          to={href({ type: 'welcome' })}
          icon={BookCheck}
          tooltip={t('navigation.tooltips.welcome')}
        >
          {t('navigation.goToWelcomePage')}
        </NavItem>
        <NavItem
          to={href({ type: 'explore' })}
          icon={Search}
          tooltip={t('navigation.tooltips.explore')}
        >
          {t('navigation.explore')}
        </NavItem>
        <NavItem
          to={href({ type: 'feed', feed: 'my' })}
          icon={Newspaper}
          tooltip={t('navigation.tooltips.myFeed')}
        >
          {t('navigation.myFeed')}
        </NavItem>
        {jamsEnabled && (
          <NavItem
            to={href({ type: 'jams' })}
            icon={PhoneCall}
            tooltip={t('navigation.tooltips.jams')}
          >
            {t('navigation.jams')}
          </NavItem>
        )}
        <NavItem
          to={href({ type: 'groups' })}
          icon={Users}
          pill={unreadGroupPosts}
          tooltip={t('navigation.tooltips.groups')}
        >
          {t('navigation.groups')}
        </NavItem>
        <NavItem
          to={href({ type: 'events' })}
          icon={CalendarDays}
          tooltip={t('navigation.tooltips.events')}
        >
          {t('navigation.events')}
        </NavItem>
        <NavItem
          to={href({ type: 'articles' })}
          icon={ScrollText}
          tooltip={t('navigation.tooltips.articles')}
        >
          {t('navigation.articles')}
        </NavItem>
        <NavItem
          to={href({ type: 'resources' })}
          icon={Library}
          tooltip={t('navigation.tooltips.resources')}
        >
          {t('navigation.resources')}
        </NavItem>
        <NavItem
          to={href({ type: 'conversation' })}
          icon={MessageSquareText}
          pill={unreadConversationThreads}
          tooltip={t('navigation.tooltips.messages')}
        >
          {t('navigation.messages')}
        </NavItem>
        <NavItem
          to={href({ type: 'members' })}
          icon={BookUser}
          tooltip={t('navigation.tooltips.members')}
        >
          {t('navigation.members')}
        </NavItem>
        <NavItem
          to={href({ type: 'feed', feed: 'bookmarks' })}
          icon={Bookmark}
          tooltip={t('navigation.tooltips.bookmarks')}
        >
          {t('navigation.bookmarks')}
        </NavItem>
        <NavItem
          to={href({ type: 'settings' })}
          icon={Settings}
          tooltip={t('navigation.tooltips.settings')}
        >
          {t('navigation.settings')}
        </NavItem>
        {showAdminMenu && (
          <div className="border-border mt-2 border-t pt-2">
            <NavWithTooltip label={adminToggleLabel}>
              <button
                type="button"
                title={adminToggleLabel}
                className="text-foreground hover:bg-surface flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
                onClick={() => setAdminExpanded((v) => !v)}
                aria-expanded={adminExpanded}
              >
                <Bolt className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {t('navigation.administration')}
                </span>
                <ChevronDown
                  className={`text-muted-foreground size-4 shrink-0 transition-transform ${adminExpanded ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
            </NavWithTooltip>
            {adminExpanded ? (
              <div className="border-border ml-2 mt-1 flex flex-col gap-0.5 border-l pl-2">
                <NavItem
                  to={href({ type: 'admin' })}
                  end
                  icon={LayoutDashboard}
                  tooltip={t('navigation.tooltips.adminOverview')}
                >
                  {t('navigation.overview')}
                </NavItem>
                {visibleAdminSections.map((section) => (
                  <NavItem
                    key={section.key}
                    to={section.path}
                    icon={adminSectionIcons[section.key]}
                    tooltip={t(adminSectionTooltipKeys[section.key])}
                  >
                    {t(adminSectionLabelKeys[section.key])}
                  </NavItem>
                ))}
              </div>
            ) : null}
          </div>
        )}
        <LogoutRow />
      </nav>
    </TooltipProvider>
  );
}

function LogoutRow() {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const logout = openpeepsApi.logoutAction();
  return (
    <NavButton
      icon={LogOut}
      danger
      tooltip={t('navigation.tooltips.logOut')}
      onClick={async () => {
        await logout();
        navigate(href({ type: 'auth', mode: 'login' }));
      }}
    >
      {t('navigation.logOut')}
    </NavButton>
  );
}

/** Profile header block for the signed-in sidebar (subset of Svelte `ProfileMenu.svelte`). */
export function AppSideBarProfileMenu() {
  const profile = useCurrentProfile();
  const { client, openpeepsApi } = useOpenpeeps();
  const serverInfo = useServerInfo();
  const navigate = useNavigate();
  const notificationStats = openpeepsApi.useCurrentProfileNotificationStats();
  const t = useT();
  const closeDrawer = useSidebarNavClose();

  // Mirror Svelte ProfileMenu: opening notifications also (re)registers this
  // device for web push using the server's VAPID public key.
  const openNotifications = async () => {
    try {
      await subscribePushNotifications({
        client,
        applicationServerKey: serverInfo.vapid.publicKey,
      });
    } catch {
      // Push registration is best-effort; ignore failures.
    } finally {
      navigate(href({ type: 'notifications' }));
      closeDrawer?.();
    }
  };

  if (!profile || profile.type !== 'local') return null;

  const handle = profile.handle;
  const label = profile.displayName?.trim() || `@${handle}`;

  const profileTooltip = t('navigation.tooltips.profile');
  const notificationsTooltip = t('navigation.tooltips.notifications');

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full px-4 py-4">
        <div className="mb-3 flex w-full items-center justify-between gap-2">
          <NavWithTooltip label={profileTooltip}>
            <NavLink
              to={`/@${handle}`}
              title={profileTooltip}
              className="flex min-w-0 flex-1 items-center gap-2"
              onClick={() => closeDrawer?.()}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="size-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="bg-surface text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {handle.slice(0, 1).toUpperCase()}
                </span>
              )}
            </NavLink>
          </NavWithTooltip>
          <NavWithTooltip label={notificationsTooltip}>
            <button
              type="button"
              title={notificationsTooltip}
              aria-label={t('navigation.openNotifications')}
              className="text-foreground hover:bg-surface relative shrink-0 rounded-md p-2"
              onClick={() => void openNotifications()}
            >
              <Bell className="size-6" aria-hidden="true" />
              <span className="sr-only">
                {t('navigation.openNotifications')}
              </span>
              {(notificationStats.data?.unseen ?? 0) > 0 ? (
                <span
                  className="bg-destructive text-destructive-foreground absolute -right-0.5 -top-0.5 flex size-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold"
                  aria-label={`${notificationStats.data?.unseen} unread notifications`}
                >
                  {formatBadgeCount(notificationStats.data?.unseen ?? 0)}
                </span>
              ) : null}
            </button>
          </NavWithTooltip>
        </div>
        <NavWithTooltip label={profileTooltip}>
          <NavLink
            to={`/@${handle}`}
            title={profileTooltip}
            className="hover:text-primary block truncate text-base font-semibold"
            onClick={() => closeDrawer?.()}
          >
            {label}
          </NavLink>
        </NavWithTooltip>
        <p className="text-muted-foreground truncate text-sm">@{handle}</p>
      </div>
    </TooltipProvider>
  );
}
