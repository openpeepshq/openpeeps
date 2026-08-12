import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Bolt,
  BookCheck,
  Bookmark,
  BookUser,
  CalendarDays,
  ChartLine,
  ChevronDown,
  DatabaseBackup,
  Database,
  Home,
  KeyRound,
  LayoutDashboard,
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
  useT,
  useOpenpeeps,
  subscribePushNotifications,
} from '@openpeepshq/react';
import {
  sideBarNavLinkClass,
  useCurrentProfile,
  useServerInfo,
  useSidebarNavClose,
} from '@openpeepshq/react/components';
import {
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
  analytics: ChartLine,
  apiKeys: KeyRound,
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
  analytics: 'navigation.analytics',
  apiKeys: 'navigation.apiKeys',
  configuration: 'navigation.configuration',
  diagnostics: 'navigation.diagnostics',
  database: 'navigation.database',
};

function NavItem({
  to,
  end,
  icon: Icon,
  children,
  pill,
}: {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  children: ReactNode;
  pill?: number;
}) {
  const closeDrawer = useSidebarNavClose();
  return (
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
          {pill > 99 ? '99+' : pill}
        </span>
      ) : null}
    </NavLink>
  );
}

function NavButton({
  icon: Icon,
  children,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  const closeDrawer = useSidebarNavClose();
  return (
    <button
      type="button"
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
}

/** Main nav links for the signed-in sidebar (parity with Svelte `MainMenu.svelte`). */
export function AppSideBarMainMenu() {
  const t = useT();
  const serverInfo = useServerInfo();
  const profile = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const jamsEnabled = serverInfo.jams.livekit.enabled;
  const unseenCounts = openpeepsApi.useUnseenPostCounts();
  const unreadGroupPosts = Object.values(
    unseenCounts.data?.groups ?? {},
  ).reduce((sum, count) => sum + count, 0);
  const unreadConversationThreads = Object.keys(
    unseenCounts.data?.direct ?? {},
  ).length;

  const visibleAdminSections =
    profile?.type === 'local' ? getVisibleAdminSections(profile.roles) : [];
  const showAdminMenu = visibleAdminSections.length > 0;

  // Mirror Svelte MainMenu: auto-expand the admin section while on /admin.
  const { pathname } = useLocation();
  const onAdminRoute = pathname.includes('/admin');
  const [adminExpanded, setAdminExpanded] = useState(onAdminRoute);
  useEffect(() => {
    if (onAdminRoute) setAdminExpanded(true);
  }, [onAdminRoute]);

  return (
    <nav
      aria-label={t('navigation.primary', { defaultValue: 'Primary' })}
      className="flex flex-col gap-0.5 py-2 pr-2"
    >
      <NavItem to={href({ type: 'feed', feed: 'local' })} icon={Home}>
        {t('navigation.community')}
      </NavItem>
      <NavItem to={href({ type: 'welcome' })} icon={BookCheck}>
        {t('navigation.goToWelcomePage')}
      </NavItem>
      <NavItem to={href({ type: 'explore' })} icon={Search}>
        {t('navigation.explore')}
      </NavItem>
      <NavItem to={href({ type: 'feed', feed: 'my' })} icon={Newspaper}>
        {t('navigation.myFeed')}
      </NavItem>
      {jamsEnabled && (
        <NavItem to={href({ type: 'jams' })} icon={PhoneCall}>
          {t('navigation.jams')}
        </NavItem>
      )}
      <NavItem
        to={href({ type: 'groups' })}
        icon={Users}
        pill={unreadGroupPosts}
      >
        {t('navigation.groups')}
      </NavItem>
      <NavItem to={href({ type: 'events' })} icon={CalendarDays}>
        {t('navigation.events')}
      </NavItem>
      <NavItem to={href({ type: 'articles' })} icon={ScrollText}>
        {t('navigation.articles')}
      </NavItem>
      <NavItem
        to={href({ type: 'conversation' })}
        icon={MessageSquareText}
        pill={unreadConversationThreads}
      >
        {t('navigation.messages')}
      </NavItem>
      <NavItem to={href({ type: 'members' })} icon={BookUser}>
        {t('navigation.members')}
      </NavItem>
      <NavItem to={href({ type: 'feed', feed: 'bookmarks' })} icon={Bookmark}>
        {t('navigation.bookmarks')}
      </NavItem>
      <NavItem to={href({ type: 'settings' })} icon={Settings}>
        {t('navigation.settings')}
      </NavItem>
      {showAdminMenu && (
        <div className="border-border mt-2 border-t pt-2">
          <button
            type="button"
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
          {adminExpanded ? (
            <div className="border-border ml-2 mt-1 flex flex-col gap-0.5 border-l pl-2">
              <NavItem to={href({ type: 'admin' })} end icon={LayoutDashboard}>
                {t('navigation.overview')}
              </NavItem>
              {visibleAdminSections.map((section) => (
                <NavItem
                  key={section.key}
                  to={section.path}
                  icon={adminSectionIcons[section.key]}
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

  return (
    <div className="w-full px-4 py-4">
      <div className="mb-3 flex w-full items-center justify-between gap-2">
        <NavLink
          to={`/@${handle}`}
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
        <button
          type="button"
          title={t('navigation.openNotifications')}
          className="text-foreground hover:bg-surface relative shrink-0 rounded-md p-2"
          onClick={() => void openNotifications()}
        >
          <Bell className="size-6" />
          {(notificationStats.data?.unseen ?? 0) > 0 ? (
            <span className="bg-destructive text-destructive-foreground absolute -right-0.5 -top-0.5 flex size-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold">
              {notificationStats.data?.unseen}
            </span>
          ) : null}
        </button>
      </div>
      <NavLink
        to={`/@${handle}`}
        className="hover:text-primary block truncate text-base font-semibold"
        onClick={() => closeDrawer?.()}
      >
        {label}
      </NavLink>
      <p className="text-muted-foreground truncate text-sm">@{handle}</p>
    </div>
  );
}
