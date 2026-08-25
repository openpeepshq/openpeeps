import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  OnboardingGuideConfig,
  OnboardingGuideState,
  OnboardingRung,
  PostCreationData,
  PublicPost,
  PublicProfile,
} from '@openpeepshq/common/types';
import {
  DEFAULT_CHATBOT_HANDLE,
  DEFAULT_ONBOARDING_GUIDE_CONFIG,
  DEFAULT_ONBOARDING_GUIDE_STATE,
  findGuideConversation,
  resolveOnboardingGuideConfig,
  resolveOnboardingGuideState,
  shouldAutoOpenDock,
  shouldShowEmptyInvite,
  shouldShowFab,
  withDismissal,
  withMute,
  withSnooze,
} from '@openpeepshq/common';
import { useT } from '../i18n';
import { useOpenpeeps } from '../contexts';
import { useCurrentProfile } from '../components/layout/IdentityContext';
import { useServerInfo } from '../components/server-data';

export type GuideIntent =
  | 'orient'
  | 'suggest_people_or_posts'
  | 'suggest_groups'
  | 'suggest_jam'
  | 'next_step'
  | 'open'
  | 'say_hello'
  | 'im_good';

const INTENT_I18N: Record<Exclude<GuideIntent, 'open'>, string> = {
  orient: 'onboardingGuide.intents.orient',
  suggest_people_or_posts: 'onboardingGuide.intents.suggest_people_or_posts',
  suggest_groups: 'onboardingGuide.intents.suggest_groups',
  suggest_jam: 'onboardingGuide.intents.suggest_jam',
  next_step: 'onboardingGuide.intents.next_step',
  say_hello: 'onboardingGuide.intents.say_hello',
  im_good: 'onboardingGuide.intents.im_good',
};

const liveRungsFromProfile = (profile: {
  avatar?: string | null;
  bio?: string;
  memberships?: unknown[];
  following?: unknown[];
}): OnboardingRung[] => {
  const rungs: OnboardingRung[] = [];
  if ((profile.memberships?.length ?? 0) > 0) rungs.push('join_group');
  if (profile.avatar && profile.bio) rungs.push('profile_face');
  if ((profile.following?.length ?? 0) > 0) {
    rungs.push('reciprocate_follow');
  }
  return rungs;
};

export type OnboardingGuideApi = {
  config: OnboardingGuideConfig;
  state: OnboardingGuideState;
  enabled: boolean;
  tokens: { community: string; guide: string; name: string };
  chatbot?: PublicProfile;
  conversationId?: string;
  messages: PublicPost[];
  sheetOpen: boolean;
  dockOpen: boolean;
  fabVisible: boolean;
  pulseFab: boolean;
  milestone: OnboardingRung | null;
  introText: string;
  openGuide: (intent?: GuideIntent) => Promise<void>;
  closeGuide: () => void;
  dismissDock: () => void;
  pauseTips: () => void;
  hideGuide: () => void;
  dismissMilestone: () => void;
  sendMessage: (text: string) => Promise<void>;
  shouldShowInvite: (surface: string) => boolean;
};

const disabledApi = (): OnboardingGuideApi => ({
  config: DEFAULT_ONBOARDING_GUIDE_CONFIG,
  state: DEFAULT_ONBOARDING_GUIDE_STATE,
  enabled: false,
  tokens: { community: '', guide: 'PeePs', name: '' },
  messages: [],
  sheetOpen: false,
  dockOpen: false,
  fabVisible: false,
  pulseFab: false,
  milestone: null,
  introText: '',
  openGuide: async () => undefined,
  closeGuide: () => undefined,
  dismissDock: () => undefined,
  pauseTips: () => undefined,
  hideGuide: () => undefined,
  dismissMilestone: () => undefined,
  sendMessage: async () => undefined,
  shouldShowInvite: () => false,
});

const OnboardingGuideContext = createContext<OnboardingGuideApi | null>(null);

export const useOnboardingGuide = (): OnboardingGuideApi =>
  useContext(OnboardingGuideContext) ?? disabledApi();

export const OnboardingGuideProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const t = useT();
  const me = useCurrentProfile();
  const serverInfo = useServerInfo();
  const { openpeepsApi, queryClient, client } = useOpenpeeps();
  const now = useMemo(() => new Date(), []);
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();
  const createPost = openpeepsApi.createPostAction();

  const config = useMemo(
    () =>
      resolveOnboardingGuideConfig(serverInfo.communityConfig?.onboardingGuide),
    [serverInfo.communityConfig?.onboardingGuide],
  );

  const state = useMemo(
    () => resolveOnboardingGuideState(settingsQuery.data?.onboardingGuide),
    [settingsQuery.data?.onboardingGuide],
  );

  const chatbotQuery = openpeepsApi.useProfileByHandle(DEFAULT_CHATBOT_HANDLE, {
    enabled: !!me && config.enabled,
  });
  const chatbot = chatbotQuery.data as PublicProfile | undefined;

  const conversationsQuery = openpeepsApi.useConversations({
    enabled: !!me && config.enabled,
  });
  const guideThread = useMemo(
    () =>
      chatbot
        ? findGuideConversation(conversationsQuery.data ?? [], chatbot.id)
        : undefined,
    [conversationsQuery.data, chatbot],
  );
  const [conversationId, setConversationId] = useState<string | undefined>();
  useEffect(() => {
    const id = guideThread?.[0]?.id;
    if (id) setConversationId(id);
  }, [guideThread]);

  const conversationQuery = openpeepsApi.useConversation(conversationId ?? '');
  const createMessage = openpeepsApi.createConversationPostAction({
    id: conversationId ?? '',
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [milestone, setMilestone] = useState<OnboardingRung | null>(null);
  const [pulseFab, setPulseFab] = useState(false);
  const hydratedRungs = useRef(false);
  const dockMarked = useRef(false);

  const tokens = useMemo(() => {
    const display = me?.displayName?.trim() || me?.handle || '';
    return {
      community: serverInfo.communityConfig?.info?.name ?? '',
      guide: config.displayName,
      name: display.split(' ')[0] || display,
    };
  }, [me, serverInfo.communityConfig?.info?.name, config.displayName]);

  const introText = useMemo(() => {
    const key =
      config.tone === 'formal'
        ? 'onboardingGuide.messages.introFormal'
        : 'onboardingGuide.messages.intro';
    const body = t(key, tokens);
    return config.customHostBlurb
      ? `${body}\n\n${config.customHostBlurb}`
      : body;
  }, [config.customHostBlurb, config.tone, t, tokens]);

  const persist = useCallback(
    async (patch: OnboardingGuideState) => {
      if (!me) return;
      const next = resolveOnboardingGuideState({ ...state, ...patch });
      await updateSettings({
        id: me.id,
        onboardingGuide: next,
      });
    },
    [me, state, updateSettings],
  );

  const createdAt = me?.createdAt;
  const enabled = !!me && config.enabled;

  useEffect(() => {
    if (!enabled || !me || dockMarked.current) return;
    if (
      shouldAutoOpenDock({
        config,
        state,
        createdAt,
        now,
      })
    ) {
      dockMarked.current = true;
      setDockOpen(true);
      void persist({ dockShownAt: now.toISOString() });
    }
  }, [enabled, me, config, state, createdAt, now, persist]);

  useEffect(() => {
    if (!enabled) return;
    if (
      !shouldShowFab({
        config,
        state,
        createdAt,
        now,
      })
    ) {
      return;
    }
    if (typeof sessionStorage === 'undefined') return;
    if (sessionStorage.getItem('op-guide-fab-pulse')) return;
    sessionStorage.setItem('op-guide-fab-pulse', '1');
    setPulseFab(true);
  }, [enabled, config, state, createdAt, now]);

  useEffect(() => {
    if (!enabled || !me || !settingsQuery.data) return;
    const live = liveRungsFromProfile(me);
    if (!hydratedRungs.current) {
      hydratedRungs.current = true;
      const missing = live.filter(
        (rung) => !state.completedRungs?.includes(rung),
      );
      if (missing.length > 0) {
        void persist({
          completedRungs: [...(state.completedRungs ?? []), ...missing],
        });
      }
      return;
    }
    const newly = live.find((rung) => !state.completedRungs?.includes(rung));
    if (newly && (state.guideOpenedAt || state.dockShownAt)) {
      setMilestone(newly);
      void persist({
        completedRungs: [...(state.completedRungs ?? []), newly],
        lastMilestoneToastRung: newly,
      });
    }
  }, [
    enabled,
    me,
    settingsQuery.data,
    state.completedRungs,
    state.guideOpenedAt,
    state.dockShownAt,
    persist,
  ]);

  const sendIntoThread = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !me || !chatbot) return;
      if (conversationId) {
        const payload: PostCreationData = {
          visibility: 'direct',
          audience: [me, chatbot],
          type: 'note',
          data: { type: 'note', content: trimmed },
        };
        await createMessage(payload);
        await conversationQuery.refetch();
        await queryClient.invalidateQueries({
          queryKey: client.conversations.list.queryKey({}),
          refetchType: 'all',
        });
        return;
      }
      const created = (await createPost({
        visibility: 'direct',
        type: 'note',
        audience: [me, chatbot],
        data: { type: 'note', content: trimmed },
      })) as { id: string };
      setConversationId(created.id);
      await queryClient.invalidateQueries({
        queryKey: client.conversations.list.queryKey({}),
        refetchType: 'all',
      });
    },
    [
      me,
      chatbot,
      conversationId,
      createMessage,
      conversationQuery,
      queryClient,
      client,
      createPost,
    ],
  );

  const openGuide = useCallback(
    async (intent: GuideIntent = 'open') => {
      setDockOpen(false);
      setSheetOpen(true);
      setMilestone(null);
      const nextState: OnboardingGuideState = {
        guideOpenedAt: state.guideOpenedAt ?? new Date().toISOString(),
        completedRungs: state.completedRungs?.includes('orient')
          ? state.completedRungs
          : [...(state.completedRungs ?? []), 'orient'],
      };
      void persist(nextState);
      if (intent === 'open' || !chatbot || !me) return;
      const key = INTENT_I18N[intent];
      await sendIntoThread(t(key));
    },
    [
      state.guideOpenedAt,
      state.completedRungs,
      persist,
      chatbot,
      me,
      sendIntoThread,
      t,
    ],
  );

  const closeGuide = useCallback(() => setSheetOpen(false), []);

  const dismissDock = useCallback(() => {
    setDockOpen(false);
    void persist(withDismissal(state, 'dock', new Date()));
  }, [persist, state]);

  const pauseTips = useCallback(() => {
    setDockOpen(false);
    void persist(withSnooze(state, new Date()));
  }, [persist, state]);

  const hideGuide = useCallback(() => {
    setDockOpen(false);
    setSheetOpen(false);
    void persist(withMute(state, new Date()));
  }, [persist, state]);

  const dismissMilestone = useCallback(() => {
    setMilestone(null);
    void persist(withDismissal(state, 'toast', new Date()));
  }, [persist, state]);

  const shouldShowInvite = useCallback(
    (surface: string) =>
      shouldShowEmptyInvite({
        config,
        state,
        createdAt,
        now,
        surface,
      }),
    [config, state, createdAt, now],
  );

  const value = useMemo<OnboardingGuideApi>(
    () => ({
      config,
      state,
      enabled,
      tokens,
      chatbot,
      conversationId,
      messages: conversationQuery.data ?? [],
      sheetOpen,
      dockOpen: dockOpen && enabled,
      fabVisible:
        enabled &&
        shouldShowFab({
          config,
          state,
          createdAt,
          now,
        }),
      pulseFab,
      milestone: enabled ? milestone : null,
      introText,
      openGuide,
      closeGuide,
      dismissDock,
      pauseTips,
      hideGuide,
      dismissMilestone,
      sendMessage: sendIntoThread,
      shouldShowInvite,
    }),
    [
      config,
      state,
      enabled,
      tokens,
      chatbot,
      conversationId,
      conversationQuery.data,
      sheetOpen,
      dockOpen,
      createdAt,
      now,
      pulseFab,
      milestone,
      introText,
      openGuide,
      closeGuide,
      dismissDock,
      pauseTips,
      hideGuide,
      dismissMilestone,
      sendIntoThread,
      shouldShowInvite,
    ],
  );

  return (
    <OnboardingGuideContext.Provider value={value}>
      {children}
    </OnboardingGuideContext.Provider>
  );
};
