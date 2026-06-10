import type { ReactNode } from 'react';
import { useState } from 'react';
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
  Home,
  KeyRound,
  LogOut,
  Logs,
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
import { NavLink, useNavigate } from 'react-router-dom';
import { useT, useOpenpeeps } from '@openpeeps/react';
import {
  useCurrentProfile,
  useServerInfo,
  useSidebarNavClose,
} from '@openpeeps/react/components';
import { hasAdminSidebarAccess } from '@openpeeps/common/lib';

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted',
    isActive ? 'bg-muted font-medium' : '',
  ].join(' ');
}

function NavItem({
  to,
  end,
  icon: Icon,
  children,
}: {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  children: ReactNode;
}) {
  const closeDrawer = useSidebarNavClose();
  return (
    <NavLink
      to={to}
      end={end}
      className={navLinkClass}
      onClick={() => closeDrawer?.()}
    >
      <Icon className="size-4 shrink-0" />
      {children}
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
        'hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm',
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
  const jamsEnabled = serverInfo.jams.livekit.enabled;

  const showAdminMenu =
    profile?.type === 'local' && hasAdminSidebarAccess(profile.roles ?? []);

  const [adminExpanded, setAdminExpanded] = useState(false);

  return (
    <nav className="flex flex-col gap-0.5 py-2 pr-2">
      <NavItem to="/feeds/local" icon={Home}>
        {t('navigation.community')}
      </NavItem>
      <NavItem to="/welcome" icon={BookCheck}>
        {t('navigation.goToWelcomePage')}
      </NavItem>
      <NavItem to="/explore" icon={Search}>
        {t('navigation.explore')}
      </NavItem>
      <NavItem to="/feeds/my" icon={Newspaper}>
        {t('navigation.myFeed')}
      </NavItem>
      {jamsEnabled && (
        <NavItem to="/jams" icon={PhoneCall}>
          {t('navigation.jams')}
        </NavItem>
      )}
      <NavItem to="/groups" icon={Users}>
        {t('navigation.groups')}
      </NavItem>
      <NavItem to="/events" icon={CalendarDays}>
        {t('navigation.events')}
      </NavItem>
      <NavItem to="/articles" icon={ScrollText}>
        {t('navigation.articles')}
      </NavItem>
      <NavItem to="/conversations" icon={MessageSquareText}>
        {t('navigation.messages')}
      </NavItem>
      <NavItem to="/members" icon={BookUser}>
        {t('navigation.members')}
      </NavItem>
      <NavItem to="/feeds/bookmarks" icon={Bookmark}>
        {t('navigation.bookmarks')}
      </NavItem>
      <NavItem to="/settings" icon={Settings}>
        {t('navigation.settings')}
      </NavItem>
      {showAdminMenu && (
        <div className="border-border mt-2 border-t pt-2">
          <button
            type="button"
            className="text-foreground hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
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
              <NavItem to="/admin/members" icon={User}>
                {t('navigation.members')}
              </NavItem>
              <NavItem to="/admin/groups" icon={Users}>
                {t('navigation.groups')}
              </NavItem>
              <NavItem to="/admin/invites" icon={MailOpen}>
                {t('navigation.invites')}
              </NavItem>
              <NavItem to="/admin/moderation" icon={ShieldAlert}>
                {t('navigation.moderation')}
              </NavItem>
              <NavItem to="/admin/backups" icon={DatabaseBackup}>
                {t('navigation.backups')}
              </NavItem>
              <NavItem to="/admin/analytics" icon={ChartLine}>
                {t('navigation.analytics')}
              </NavItem>
              <NavItem to="/admin/logs" icon={Logs}>
                {t('navigation.logs')}
              </NavItem>
              <NavItem to="/admin/api-keys" icon={KeyRound}>
                API Keys
              </NavItem>
              <NavItem to="/admin/diagnostics" icon={Stethoscope}>
                {t('navigation.diagnostics', { defaultValue: 'Diagnostics' })}
              </NavItem>
              <NavItem to="/admin/configuration" icon={Wrench}>
                {t('navigation.configuration')}
              </NavItem>
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
  return (
    <NavButton
      icon={LogOut}
      danger
      onClick={async () => {
        await openpeepsApi.logoutAction()();
        navigate('/auth/login');
      }}
    >
      {t('navigation.logOut')}
    </NavButton>
  );
}

/** Profile header block for the signed-in sidebar (subset of Svelte `ProfileMenu.svelte`). */
export function AppSideBarProfileMenu() {
  const profile = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const notificationStats = openpeepsApi.useCurrentProfileNotificationStats();
  const t = useT();
  const closeDrawer = useSidebarNavClose();

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
            <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {handle.slice(0, 1).toUpperCase()}
            </span>
          )}
        </NavLink>
        <NavLink
          to="/notifications"
          title={t('navigation.openNotifications')}
          className="text-foreground hover:bg-muted relative shrink-0 rounded-md p-2"
          onClick={() => closeDrawer?.()}
        >
          <Bell className="size-6" />
          {(notificationStats.data?.unseen ?? 0) > 0 ? (
            <span className="bg-destructive text-destructive-foreground absolute -right-0.5 -top-0.5 flex size-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold">
              {notificationStats.data?.unseen}
            </span>
          ) : null}
        </NavLink>
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
