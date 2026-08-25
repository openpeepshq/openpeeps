import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
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
} from '@openpeepshq/react';
import type { i18n as I18nInstance } from 'i18next';
import {
  OpenpeepsContextProvider,
  OpenpeepsThemeProvider,
  PluginLoader,
  PluginRegistryProvider,
  ProfileProvider,
  RootLayout,
  ServerDataProvider,
} from '@openpeepshq/react/components';

import {
  About,
  CodeOfConduct,
  Home,
  NotFound,
  Welcome,
  AuthClosed,
  Login,
  Register,
  RegisterInvitation,
  RequestResetPassword,
  ResetPassword,
  ValidateEmail,
  Settings,
  FeedsLocal,
  FeedsMy,
  FeedsBookmarks,
  TagsPage,
  PostDetail,
  NotificationsPage,
  ProfilePage,
  ExplorePage,
  MembersPage,
  ConversationsIndex,
  NewConversation,
  ConversationShow,
  EventsIndex,
  EventsMy,
  GroupsIndex,
  GroupShow,
  GroupInfo,
  GroupMembers,
  JamsIndex,
  JamEvent,
  ArticlesIndex,
  ProfileFollowers,
  PublicProfileSettings,
  ThemeSettings,
  AccountSettings,
  NotificationSettingsPage,
  BillingSettings,
  NewGroup,
  NewEvent,
  NewArticle,
  AdminDashboard,
  AdminAnalytics,
  AnalyticsOverviewPage,
  AnalyticsMembersPage,
  AnalyticsContentPage,
  AnalyticsEngagementPage,
  AnalyticsGroupsPage,
  AnalyticsReportSettingsPage,
  AdminBackups,
  AdminGroups,
  AdminInvites,
  AdminMembers,
  AdminModeration,
  PaymentSuccess,
  TestMarkdown,
  TestError,
  PluginsIndex,
  EditArticle,
  EditEvent,
  EditGroup,
  EditGroupInfo,
  EditGroupRoles,
  AdminConfiguration,
  AdminConfigurationCommunity,
  AdminConfigEditor,
  AdminConfigurationI18n,
  AdminConfigurationCommunityInfo,
  AdminConfigurationCommunityLinks,
  CommunityMarkdownPage,
  AdminConfigurationCommunityFavicons,
  AdminConfigurationCommunityTheme,
  AdminConfigurationCommunityProfileFields,
  AdminConfigurationCommunityRoles,
  AdminGroupMembers,
  AdminReports,
  AdminApiKeys,
  AdminPlugins,
  AdminDiagnostics,
  AdminDiagnosticsEmail,
  AdminDiagnosticsLogs,
  AdminConfigurationEmail,
  AccessTokensSettings,
  LanguageSettings,
  NotificationPreferences,
  PushEnabledDevices,
  ConversationInfo,
  SsoCallback,
  OidcCallback,
  OidcPending,
  AdminDb,
  AdminDiagnosticsJob,
  AdminDiagnosticsPerformance,
  AdminConfigurationCommunityLanguage,
} from '@openpeepshq/react/pages';

import { DocsLayout } from './pages/docs/DocsLayout';
import { DocsPage } from './pages/docs/DocsPage';

import {
  AppSideBarMainMenu,
  AppSideBarProfileMenu,
} from './navigation/AppSideBarMenus';
import {
  RequireAdminMenu,
  RequireAdminSection,
} from './navigation/RequireAdminSection';
import { LoadingSpinner } from '@openpeepshq/react-ui';
import { createWebNavigator } from './navigation/webNavigator';

const webNavigator = createWebNavigator();

const baseUrl =
  import.meta.env.VITE_OPENPEEPS_BASE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * Bridges react-router-dom to the `RouterAdapter` interface expected by
 * `@openpeepshq/react`'s `RouterProvider`.
 */
function ReactRouterAdapter({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useReactRouterNavigate();
  const [searchParams] = useReactRouterSearchParams();

  const adapter = useMemo<RouterAdapter>(
    () => ({
      pathname: location.pathname,
      searchParams,
      hrefOf: webNavigator.hrefOf,
      match: webNavigator.match,
      navigate: (target) => {
        const url =
          typeof target === 'string' ? target : webNavigator.hrefOf(target);
        void navigate(url);
      },
      back: () => {
        void navigate(-1);
      },
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
      <LoadingSpinner />
    </div>
  );
}

/**
 * Async i18n boot. Initialises the global i18next instance against the
 * server's `/api/openpeeps/core/v1/i18n/{{lng}}` backend before mounting
 * the rest of the tree.
 */
function I18nBoot({ children }: { children: ReactNode }) {
  const [i18n, setI18n] = useState<I18nInstance | null>(null);

  useEffect(() => {
    const lang =
      (typeof navigator !== 'undefined' && navigator.language?.slice(0, 2)) ||
      'en';
    initI18N(lang, baseUrl).then(setI18n);
  }, []);

  if (!i18n) return <BootSplash />;

  return <I18nProvider instance={i18n}>{children}</I18nProvider>;
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
  EditInfo: EditGroupInfo,
  EditRoles: EditGroupRoles,
  Members: GroupMembers,
};

const Explore = ExplorePage;

const Tags = TagsPage;

const Members = MembersPage;

const Conversations = {
  Index: ConversationsIndex,
  New: NewConversation,
  Detail: ConversationShow,
  Info: () => <ConversationInfo />,
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
  Diagnostics: AdminDiagnostics,
  DiagnosticsEmail: AdminDiagnosticsEmail,
  DiagnosticsLogs: AdminDiagnosticsLogs,
  DiagnosticsJob: AdminDiagnosticsJob,
  DiagnosticsPerformance: AdminDiagnosticsPerformance,
  ApiKeys: AdminApiKeys,
  Plugins: AdminPlugins,
  Db: AdminDb,
  Members: AdminMembers,
  Invites: AdminInvites,
  Backups: AdminBackups,
  Analytics: AdminAnalytics,
  AnalyticsOverview: AnalyticsOverviewPage,
  AnalyticsMembers: AnalyticsMembersPage,
  AnalyticsContent: AnalyticsContentPage,
  AnalyticsEngagement: AnalyticsEngagementPage,
  AnalyticsGroups: AnalyticsGroupsPage,
  AnalyticsReports: AnalyticsReportSettingsPage,
  Moderation: AdminModeration,
  ModerationReports: AdminReports,
  Groups: AdminGroups,
  GroupMembers: AdminGroupMembers,
  Config: {
    Index: AdminConfiguration,
    ServerSettings: () => (
      <AdminConfigEditor
        title="Server settings"
        namespace="openpeeps"
        name="core"
      />
    ),
    I18n: AdminConfigurationI18n,
    Community: AdminConfigurationCommunity,
    CommunityInfo: AdminConfigurationCommunityInfo,
    CommunityLanguage: AdminConfigurationCommunityLanguage,
    CommunityFavicons: AdminConfigurationCommunityFavicons,
    CommunityProfileFields: AdminConfigurationCommunityProfileFields,
    CommunityAboutPage: () => (
      <CommunityMarkdownPage
        path={['content', 'aboutPage']}
        titleKey="configuration.community.aboutPage.title"
        descriptionKey="configuration.community.aboutPage.description"
      />
    ),
    CommunityRoles: AdminConfigurationCommunityRoles,
    CommunityWelcomeEmail: () => (
      <CommunityMarkdownPage
        path={['content', 'welcomeEmail']}
        titleKey="configuration.community.welcomeEmail.title"
        descriptionKey="configuration.community.welcomeEmail.description"
      />
    ),
    CommunityTheme: AdminConfigurationCommunityTheme,
    CommunityLinks: AdminConfigurationCommunityLinks,
    CommunityWelcomePage: () => (
      <CommunityMarkdownPage
        path={['content', 'welcomePage']}
        titleKey="configuration.community.welcomePage.title"
        descriptionKey="configuration.community.welcomePage.description"
      />
    ),
    CommunityCodeOfConduct: () => (
      <CommunityMarkdownPage
        path={['content', 'codeOfConduct']}
        titleKey="configuration.community.codeOfConduct.title"
        descriptionKey="configuration.community.codeOfConduct.description"
      />
    ),
    Email: AdminConfigurationEmail,
  },
};

const MiscPages = {
  Payment: () => <PaymentSuccess />,
  SsoGeneric: SsoCallback,
  TestMarkdown: () => <TestMarkdown />,
  TestError: () => <TestError />,
};

function AppShell() {
  return (
    <OpenpeepsContextProvider>
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
            <Route path="/auth/validate-email" element={<ValidateEmail />} />
            <Route path="/auth/closed" element={<AuthClosed />} />
            <Route
              path="/auth/sso/generic"
              element={<MiscPages.SsoGeneric />}
            />
            <Route path="/auth/sso/oidc/pending" element={<OidcPending />} />
            <Route
              path="/auth/sso/oidc/:id/callback"
              element={<OidcCallback />}
            />

            {/* Jam room: full-screen, outside the sidebar RootLayout */}
            <Route path="/events/:eventId/jam" element={<Jams.Event />} />

            {/* AuthLayout pages: full-bleed auth shell, not inside RootLayout */}
            <Route path="/about" element={<About />} />
            <Route path="/code-of-conduct" element={<CodeOfConduct />} />

            <Route
              path="/docs/*"
              element={
                <DocsLayout>
                  <DocsPage />
                </DocsLayout>
              }
            />
            <Route
              path="/docs"
              element={
                <DocsLayout>
                  <DocsPage />
                </DocsLayout>
              }
            />

            <Route
              path="/admin/logs"
              element={<Navigate to="/admin/diagnostics/logs" replace />}
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
                    <Route
                      path="/payment/success"
                      element={<MiscPages.Payment />}
                    />
                    <Route
                      path="/test/markdown"
                      element={<MiscPages.TestMarkdown />}
                    />
                    <Route
                      path="/test/error"
                      element={<MiscPages.TestError />}
                    />
                    <Route
                      element={<RequireAdminSection section="configuration" />}
                    >
                      <Route path="/plugins" element={<PluginsIndex />} />
                    </Route>

                    {/* Feeds */}
                    <Route path="/feeds/local" element={<Feeds.Local />} />
                    <Route path="/feeds/my" element={<Feeds.My />} />
                    <Route
                      path="/feeds/bookmarks"
                      element={<Feeds.Bookmarks />}
                    />

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

                    {/* Jams (the in-jam room route is full-screen, declared
                        outside RootLayout below) */}
                    <Route path="/jams" element={<Jams.Index />} />
                    <Route path="/jams/my" element={<Jams.My />} />

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
                      path="/groups/:handle/edit/info"
                      element={<Groups.EditInfo />}
                    />
                    <Route
                      path="/groups/:handle/edit/roles"
                      element={<Groups.EditRoles />}
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
                    <Route
                      path="/conversations"
                      element={<Conversations.Index />}
                    />
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

                    {/* Admin landing: any visible section grants access */}
                    <Route element={<RequireAdminMenu />}>
                      <Route path="/admin" element={<Admin.Index />} />
                    </Route>

                    <Route element={<RequireAdminSection section="members" />}>
                      <Route
                        path="/admin/members"
                        element={<Admin.Members />}
                      />
                    </Route>

                    <Route element={<RequireAdminSection section="apiKeys" />}>
                      <Route
                        path="/admin/api-keys"
                        element={<Admin.ApiKeys />}
                      />
                    </Route>

                    <Route element={<RequireAdminSection section="plugins" />}>
                      <Route
                        path="/admin/plugins"
                        element={<Admin.Plugins />}
                      />
                    </Route>

                    <Route element={<RequireAdminSection section="invites" />}>
                      <Route
                        path="/admin/invites"
                        element={<Admin.Invites />}
                      />
                    </Route>

                    <Route element={<RequireAdminSection section="backups" />}>
                      <Route
                        path="/admin/backups"
                        element={<Admin.Backups />}
                      />
                    </Route>

                    <Route
                      element={<RequireAdminSection section="analytics" />}
                    >
                      <Route
                        path="/admin/analytics"
                        element={<Admin.Analytics />}
                      >
                        <Route index element={<Admin.AnalyticsOverview />} />
                        <Route
                          path="members"
                          element={<Admin.AnalyticsMembers />}
                        />
                        <Route
                          path="content"
                          element={<Admin.AnalyticsContent />}
                        />
                        <Route
                          path="engagement"
                          element={<Admin.AnalyticsEngagement />}
                        />
                        <Route
                          path="groups"
                          element={<Admin.AnalyticsGroups />}
                        />
                        <Route
                          path="reports"
                          element={<Admin.AnalyticsReports />}
                        />
                        <Route
                          path="growth"
                          element={<Admin.AnalyticsMembers />}
                        />
                        <Route
                          path="retention"
                          element={<Admin.AnalyticsMembers />}
                        />
                      </Route>
                    </Route>

                    <Route
                      element={<RequireAdminSection section="moderation" />}
                    >
                      <Route
                        path="/admin/moderation"
                        element={<Admin.Moderation />}
                      />
                      <Route
                        path="/admin/moderation/reports/:handle"
                        element={<Admin.ModerationReports />}
                      />
                    </Route>

                    <Route element={<RequireAdminSection section="groups" />}>
                      <Route path="/admin/groups" element={<Admin.Groups />} />
                      <Route
                        path="/admin/groups/:handle/members"
                        element={<Admin.GroupMembers />}
                      />
                    </Route>

                    {/* Admin · configuration */}
                    <Route
                      element={<RequireAdminSection section="configuration" />}
                    >
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
                    </Route>

                    {/* Admin · diagnostics */}
                    <Route
                      element={<RequireAdminSection section="diagnostics" />}
                    >
                      <Route
                        path="/admin/diagnostics"
                        element={<Admin.Diagnostics />}
                      />
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
                      <Route
                        path="/admin/diagnostics/performance"
                        element={<Admin.DiagnosticsPerformance />}
                      />
                    </Route>

                    <Route element={<RequireAdminSection section="database" />}>
                      <Route path="/admin/db" element={<Admin.Db />} />
                    </Route>

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
              <PluginRegistryProvider>
                <PluginLoader />
                <ProfileProvider>
                  <AppShell />
                </ProfileProvider>
              </PluginRegistryProvider>
            </ServerData>
          </OpenpeepsProvider>
        </I18nBoot>
      </ReactRouterAdapter>
    </BrowserRouter>
  );
}
