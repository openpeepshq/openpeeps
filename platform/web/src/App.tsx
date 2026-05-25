import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate as useReactRouterNavigate,
  useSearchParams as useReactRouterSearchParams,
} from 'react-router-dom';

import {
  I18nProvider,
  initI18N,
  OpenpeepsProvider,
  pwa,
  RouterProvider,
  credentialsStore,
  useOpenpeeps,
  type RouterAdapter,
} from '@openpeeps/react';
import {
  OpenpeepsContextProvider,
  OpenpeepsThemeProvider,
  ProfileProvider,
  RootLayout,
  ServerDataProvider,
} from '@openpeeps/react/components';

import { About } from './pages/About';
import { CodeOfConduct } from './pages/CodeOfConduct';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { Welcome } from './pages/Welcome';

import { AuthClosed } from './pages/auth/Closed';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { RegisterInvitation } from './pages/auth/RegisterInvitation';
import { RequestResetPassword } from './pages/auth/RequestResetPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

import { Settings } from './pages/settings/Index';

import { FeedsLocal } from './pages/feeds/Local';
import { FeedsMy } from './pages/feeds/My';
import { FeedsBookmarks } from './pages/feeds/Bookmarks';
import { Tags as TagsPage } from './pages/Tags';
import { PostDetail } from './pages/PostDetail';
import { Notifications as NotificationsPage } from './pages/Notifications';
import { Profile as ProfilePage } from './pages/Profile';
import { Explore as ExplorePage } from './pages/Explore';
import { Members as MembersPage } from './pages/Members';
import { ConversationsIndex } from './pages/conversations/Index';
import { NewConversation } from './pages/conversations/New';
import { ConversationShow } from './pages/conversations/Show';
import { EventsIndex } from './pages/events/Index';
import { EventsMy } from './pages/events/My';
import { GroupsIndex } from './pages/groups/Index';
import { GroupShow } from './pages/groups/Show';
import { GroupInfo } from './pages/groups/Info';
import { GroupMembers } from './pages/groups/Members';
import { JamsIndex } from './pages/jams/Index';
import { JamEvent } from './pages/jams/Event';
import { ArticlesIndex } from './pages/articles/Index';
import { Followers as ProfileFollowers } from './pages/profile/Followers';
import { PublicProfileSettings } from './pages/settings/PublicProfile';
import { ThemeSettings } from './pages/settings/Theme';
import { AccountSettings } from './pages/settings/Account';
import { NotificationSettings as NotificationSettingsPage } from './pages/settings/Notifications';
import { BillingSettings } from './pages/settings/Billing';
import { NewGroup } from './pages/groups/New';
import { NewEvent } from './pages/events/New';
import { NewArticle } from './pages/articles/New';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminAnalytics } from './pages/admin/Analytics';
import { AdminBackups } from './pages/admin/Backups';
import { AdminGroups } from './pages/admin/Groups';
import { AdminInvites } from './pages/admin/Invites';
import { AdminMembers } from './pages/admin/Members';
import { AdminModeration } from './pages/admin/Moderation';
import { PaymentSuccess } from './pages/payment/Success';
import { TestMarkdown } from './pages/test/Markdown';
import { TestError } from './pages/test/Error';
import { EditArticle } from './pages/articles/Edit';
import { EditEvent } from './pages/events/Edit';
import { EditGroup } from './pages/groups/Edit';
import { AdminConfiguration } from './pages/admin/Configuration';
import { AdminConfigEditor } from './pages/admin/ConfigEditor';
import { AdminGroupMembers } from './pages/admin/GroupMembers';
import { AdminReports } from './pages/admin/Reports';
import { AdminApiKeys } from './pages/admin/ApiKeys';
import { AdminDiagnostics } from './pages/admin/Diagnostics';
import { AdminDiagnosticsEmail } from './pages/admin/DiagnosticsEmail';
import { AdminDiagnosticsLogs } from './pages/admin/DiagnosticsLogs';
import { AdminConfigurationEmail } from './pages/admin/ConfigurationEmail';
import { AccessTokensSettings } from './pages/settings/AccessTokens';
import { LanguageSettings } from './pages/settings/Language';
import { NotificationPreferences } from './pages/settings/NotificationPreferences';
import { PushEnabledDevices } from './pages/settings/PushEnabledDevices';
import { ConversationInfo } from './pages/conversations/Info';
import { SsoCallback } from './pages/auth/SsoCallback';

import { AdminDb } from './pages/admin/Db';
import { AdminDiagnosticsJob } from './pages/admin/DiagnosticsJob';
import { AdminConfigurationCommunityLanguage } from './pages/admin/ConfigurationCommunityLanguage';
import {
  AppSideBarMainMenu,
  AppSideBarProfileMenu,
} from './navigation/AppSideBarMenus';

const baseUrl =
  import.meta.env.VITE_OPENPEEPS_BASE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * Bridges react-router-dom to the `RouterAdapter` interface expected by
 * `@openpeeps/react`'s `RouterProvider`.
 */
function ReactRouterAdapter({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useReactRouterNavigate();
  const [searchParams] = useReactRouterSearchParams();

  const adapter = useMemo<RouterAdapter>(
    () => ({
      pathname: location.pathname,
      searchParams,
      navigate: (url) => navigate(url),
      back: () => navigate(-1),
    }),
    [location.pathname, searchParams, navigate],
  );

  return <RouterProvider adapter={adapter}>{children}</RouterProvider>;
}

function ServerData({ children }: { children: ReactNode }) {
  const { client } = useOpenpeeps();
  return (
    <ServerDataProvider client={client} fallback={<BootSplash />}>
      {children}
    </ServerDataProvider>
  );
}

function BootSplash() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading…</p>
    </div>
  );
}

/**
 * Async i18n boot. Initialises the global i18next instance against the
 * server's `/api/openpeeps/core/v1/i18n/{{lng}}` backend before mounting
 * the rest of the tree.
 */
function I18nBoot({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const lang =
      (typeof navigator !== 'undefined' && navigator.language?.slice(0, 2)) ||
      'en';
    initI18N(lang, baseUrl).then(() => setReady(true));
  }, []);

  if (!ready) return <BootSplash />;

  return <I18nProvider>{children}</I18nProvider>;
}

/* ------------------------------------------------------------------ routes --
 *
 * Most Svelte routes are ported. Specialized post renderers (FullEvent,
 * FullPoll, FullArticle) still use the generic feed card in PostDetail.
 */

const Feeds = {
  Local: FeedsLocal,
  My: FeedsMy,
  Bookmarks: FeedsBookmarks,
};

const Posts = {
  Detail: PostDetail,
};

const Profiles = {
  Show: ProfilePage,
  Followers: () => <ProfileFollowers />,
  Following: () => <ProfileFollowers following />,
};

const Articles = {
  Index: ArticlesIndex,
  New: NewArticle,
  Edit: EditArticle,
};

const Jams = {
  Index: JamsIndex,
  My: () => <JamsIndex my />,
  Event: JamEvent,
};

const Events = {
  Index: EventsIndex,
  My: EventsMy,
  New: NewEvent,
  Edit: EditEvent,
};

const Groups = {
  Index: GroupsIndex,
  New: NewGroup,
  Show: GroupShow,
  Info: GroupInfo,
  Edit: EditGroup,
  Members: GroupMembers,
};

const Explore = ExplorePage;

const Tags = TagsPage;

const Members = MembersPage;

const Conversations = {
  Index: ConversationsIndex,
  New: NewConversation,
  Detail: ConversationShow,
  Info: () => (
    <ConversationInfo />
  ),
};

const Notifications = NotificationsPage;

const SettingsPages = {
  PublicProfile: PublicProfileSettings,
  Theme: ThemeSettings,
  Account: AccountSettings,
  Notifications: NotificationSettingsPage,
  NotificationPreferences,
  PushEnabledDevices,
  Language: LanguageSettings,
  Billing: BillingSettings,
  AccessTokens: AccessTokensSettings,
};

const Admin = {
  Index: AdminDashboard,
  Logs: AdminDiagnosticsLogs,
  Diagnostics: AdminDiagnostics,
  DiagnosticsEmail: AdminDiagnosticsEmail,
  DiagnosticsLogs: AdminDiagnosticsLogs,
  DiagnosticsJob: AdminDiagnosticsJob,
  ApiKeys: AdminApiKeys,
  Db: AdminDb,
  Members: AdminMembers,
  Invites: AdminInvites,
  Backups: AdminBackups,
  Analytics: AdminAnalytics,
  Moderation: AdminModeration,
  ModerationReports: AdminReports,
  Groups: AdminGroups,
  GroupMembers: AdminGroupMembers,
  Config: {
    Index: AdminConfiguration,
    ServerSettings: () => (
      <AdminConfigEditor
        title="Server settings"
        namespace="server"
        name="settings"
      />
    ),
    I18n: () => (
      <AdminConfigEditor title="Translations" namespace="i18n" name="overrides" />
    ),
    Community: AdminConfiguration,
    CommunityInfo: () => (
      <AdminConfigEditor title="Community info" namespace="community" name="info" />
    ),
    CommunityLanguage: AdminConfigurationCommunityLanguage,
    CommunityFavicons: () => (
      <AdminConfigEditor
        title="Favicons"
        namespace="community"
        name="favicons"
      />
    ),
    CommunityProfileFields: () => (
      <AdminConfigEditor
        title="Profile fields"
        namespace="community"
        name="profileFields"
      />
    ),
    CommunityAboutPage: () => (
      <AdminConfigEditor
        title="About page"
        namespace="community"
        name="aboutPage"
      />
    ),
    CommunityRoles: () => (
      <AdminConfigEditor title="Roles" namespace="community" name="roles" />
    ),
    CommunityWelcomeEmail: () => (
      <AdminConfigEditor
        title="Welcome email"
        namespace="community"
        name="welcomeEmail"
      />
    ),
    CommunityTheme: () => (
      <AdminConfigEditor title="Theme" namespace="community" name="theme" />
    ),
    CommunityLinks: () => (
      <AdminConfigEditor title="Links" namespace="community" name="links" />
    ),
    CommunityWelcomePage: () => (
      <AdminConfigEditor
        title="Welcome page"
        namespace="community"
        name="welcomePage"
      />
    ),
    CommunityCodeOfConduct: () => (
      <AdminConfigEditor
        title="Code of conduct"
        namespace="community"
        name="codeOfConduct"
      />
    ),
    Email: AdminConfigurationEmail,
  },
};

const MiscPages = {
  Payment: () => (
    <PaymentSuccess />
  ),
  SsoGeneric: SsoCallback,
  TestMarkdown: () => (
    <TestMarkdown />
  ),
  TestError: () => (
    <TestError />
  ),
};

function AppShell() {
  const location = useLocation();
  return (
    <OpenpeepsContextProvider pathname={location.pathname}>
      <OpenpeepsThemeProvider>
        <pwa.PwaProvider enabled={import.meta.env.PROD}>
          <Routes>
            {/* Standalone (no shell): auth + standalone admin tools */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route
              path="/auth/register/invitation"
              element={<RegisterInvitation />}
            />
            <Route
              path="/auth/request-reset-password"
              element={<RequestResetPassword />}
            />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/closed" element={<AuthClosed />} />
            <Route path="/auth/sso/generic" element={<MiscPages.SsoGeneric />} />

            {/* AuthLayout pages: full-bleed auth shell, not inside RootLayout */}
            <Route path="/about" element={<About />} />
            <Route path="/code-of-conduct" element={<CodeOfConduct />} />

            <Route path="/admin/logs" element={<Admin.Logs />} />
            <Route path="/admin/db" element={<Admin.Db />} />
            <Route path="/admin/api-keys" element={<Admin.ApiKeys />} />
            <Route path="/admin/diagnostics" element={<Admin.Diagnostics />} />
            <Route
              path="/admin/diagnostics/email"
              element={<Admin.DiagnosticsEmail />}
            />
            <Route
              path="/admin/diagnostics/logs"
              element={<Admin.DiagnosticsLogs />}
            />
            <Route
              path="/admin/diagnostics/jobs/:queue/:jobId"
              element={<Admin.DiagnosticsJob />}
            />

            {/* Everything else under the standard RootLayout shell */}
            <Route
              path="/*"
              element={
                <RootLayout
                  sideBar={{
                    mainMenu: () => <AppSideBarMainMenu />,
                    profileMenu: () => <AppSideBarProfileMenu />,
                  }}
                >
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/home" element={<Feeds.Local />} />
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/payment/success" element={<MiscPages.Payment />} />
                    <Route path="/test/markdown" element={<MiscPages.TestMarkdown />} />
                    <Route path="/test/error" element={<MiscPages.TestError />} />

                    {/* Feeds */}
                    <Route path="/feeds/local" element={<Feeds.Local />} />
                    <Route path="/feeds/my" element={<Feeds.My />} />
                    <Route path="/feeds/bookmarks" element={<Feeds.Bookmarks />} />

                    {/* Posts + profile timeline */}
                    <Route path="/posts/:postId" element={<Posts.Detail />} />

                    {/* Articles */}
                    <Route path="/articles" element={<Articles.Index />} />
                    <Route path="/articles/new" element={<Articles.New />} />
                    <Route
                      path="/articles/:articleId/edit"
                      element={<Articles.Edit />}
                    />

                    {/* Profile (`@handle`) — React Router v7 cannot do
                        partial-segment params (`/@:handle`), so the segment
                        captures the whole `@handle` value and the leading `@`
                        is stripped via `routeHandleParam()`. */}
                    <Route path="/:handle" element={<Profiles.Show />} />
                    <Route
                      path="/:handle/followers"
                      element={<Profiles.Followers />}
                    />
                    <Route
                      path="/:handle/following"
                      element={<Profiles.Following />}
                    />

                    {/* Jams */}
                    <Route path="/jams" element={<Jams.Index />} />
                    <Route path="/jams/my" element={<Jams.My />} />
                    <Route path="/events/:eventId/jam" element={<Jams.Event />} />

                    {/* Events */}
                    <Route path="/events" element={<Events.Index />} />
                    <Route path="/events/my" element={<Events.My />} />
                    <Route path="/events/new" element={<Events.New />} />
                    <Route
                      path="/events/:eventId/edit"
                      element={<Events.Edit />}
                    />

                    {/* Groups */}
                    <Route path="/groups" element={<Groups.Index />} />
                    <Route path="/groups/new" element={<Groups.New />} />
                    <Route path="/groups/:handle" element={<Groups.Show />} />
                    <Route
                      path="/groups/:handle/info"
                      element={<Groups.Info />}
                    />
                    <Route
                      path="/groups/:handle/edit"
                      element={<Groups.Edit />}
                    />
                    <Route
                      path="/groups/:handle/members"
                      element={<Groups.Members />}
                    />

                    {/* Discovery */}
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/tags/:hashtag" element={<Tags />} />
                    <Route path="/members" element={<Members />} />

                    {/* Conversations */}
                    <Route path="/conversations" element={<Conversations.Index />} />
                    <Route
                      path="/conversations/new"
                      element={<Conversations.New />}
                    />
                    <Route
                      path="/conversations/:id"
                      element={<Conversations.Detail />}
                    />
                    <Route
                      path="/conversations/:id/info"
                      element={<Conversations.Info />}
                    />

                    {/* Settings */}
                    <Route path="/settings" element={<Settings />} />
                    <Route
                      path="/settings/public-profile"
                      element={<SettingsPages.PublicProfile />}
                    />
                    <Route
                      path="/settings/theme"
                      element={<SettingsPages.Theme />}
                    />
                    <Route
                      path="/settings/account"
                      element={<SettingsPages.Account />}
                    />
                    <Route
                      path="/settings/notifications"
                      element={<SettingsPages.Notifications />}
                    />
                    <Route
                      path="/settings/notifications/preferences"
                      element={<SettingsPages.NotificationPreferences />}
                    />
                    <Route
                      path="/settings/notifications/push-enabled-devices"
                      element={<SettingsPages.PushEnabledDevices />}
                    />
                    <Route
                      path="/settings/language"
                      element={<SettingsPages.Language />}
                    />
                    <Route
                      path="/settings/billing"
                      element={<SettingsPages.Billing />}
                    />
                    <Route
                      path="/settings/access-tokens"
                      element={<SettingsPages.AccessTokens />}
                    />

                    {/* Admin */}
                    <Route path="/admin" element={<Admin.Index />} />
                    <Route path="/admin/members" element={<Admin.Members />} />
                    <Route path="/admin/invites" element={<Admin.Invites />} />
                    <Route path="/admin/backups" element={<Admin.Backups />} />
                    <Route path="/admin/analytics" element={<Admin.Analytics />} />
                    <Route
                      path="/admin/moderation"
                      element={<Admin.Moderation />}
                    />
                    <Route
                      path="/admin/moderation/reports/:handle"
                      element={<Admin.ModerationReports />}
                    />
                    <Route path="/admin/groups" element={<Admin.Groups />} />
                    <Route
                      path="/admin/groups/:handle/members"
                      element={<Admin.GroupMembers />}
                    />

                    {/* Admin · configuration */}
                    <Route
                      path="/admin/configuration"
                      element={<Admin.Config.Index />}
                    />
                    <Route
                      path="/admin/configuration/server-settings"
                      element={<Admin.Config.ServerSettings />}
                    />
                    <Route
                      path="/admin/configuration/i18n"
                      element={<Admin.Config.I18n />}
                    />
                    <Route
                      path="/admin/configuration/community"
                      element={<Admin.Config.Community />}
                    />
                    <Route
                      path="/admin/configuration/community/info"
                      element={<Admin.Config.CommunityInfo />}
                    />
                    <Route
                      path="/admin/configuration/community/language"
                      element={<Admin.Config.CommunityLanguage />}
                    />
                    <Route
                      path="/admin/configuration/community/favicons"
                      element={<Admin.Config.CommunityFavicons />}
                    />
                    <Route
                      path="/admin/configuration/community/profile-fields"
                      element={<Admin.Config.CommunityProfileFields />}
                    />
                    <Route
                      path="/admin/configuration/community/about-page"
                      element={<Admin.Config.CommunityAboutPage />}
                    />
                    <Route
                      path="/admin/configuration/community/roles"
                      element={<Admin.Config.CommunityRoles />}
                    />
                    <Route
                      path="/admin/configuration/community/welcome-email"
                      element={<Admin.Config.CommunityWelcomeEmail />}
                    />
                    <Route
                      path="/admin/configuration/community/theme"
                      element={<Admin.Config.CommunityTheme />}
                    />
                    <Route
                      path="/admin/configuration/community/links"
                      element={<Admin.Config.CommunityLinks />}
                    />
                    <Route
                      path="/admin/configuration/community/welcome-page"
                      element={<Admin.Config.CommunityWelcomePage />}
                    />
                    <Route
                      path="/admin/configuration/community/code-of-conduct"
                      element={<Admin.Config.CommunityCodeOfConduct />}
                    />
                    <Route
                      path="/admin/configuration/email"
                      element={<Admin.Config.Email />}
                    />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </RootLayout>
              }
            />
          </Routes>
        </pwa.PwaProvider>
      </OpenpeepsThemeProvider>
    </OpenpeepsContextProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ReactRouterAdapter>
        <I18nBoot>
          <OpenpeepsProvider
            credentialsStore={credentialsStore}
            baseUrl={baseUrl}
          >
            <ServerData>
              <ProfileProvider>
                <AppShell />
              </ProfileProvider>
            </ServerData>
          </OpenpeepsProvider>
        </I18nBoot>
      </ReactRouterAdapter>
    </BrowserRouter>
  );
}
