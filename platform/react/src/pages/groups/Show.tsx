import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { groupSectionFromHash } from '@openpeepshq/common/lib';
import { useT, useOpenpeeps } from '../../index';
import {
  EventsView,
  Feed,
  GroupFeed,
  GroupHeader,
  NewEventButton,
  NewResourceButton,
  PostMarkdown,
  useCurrentProfile,
} from '../../components';
import { routeHandleParam } from '../../lib/routeHandles';
import { LoadingSpinner } from '@openpeepshq/react-ui';
import { ResourceLibrary } from '../../components/resources/ResourceLibrary';

export function GroupShow() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const { openpeepsApi } = useOpenpeeps();

  const groupQuery = openpeepsApi.useGroupByHandle(handle);
  const group = groupQuery.data;
  const currentProfile = useCurrentProfile();
  const tab = groupSectionFromHash(location.hash);

  // Raw anchors (shared links, markdown) change the hash without going
  // through the router. Mirror that into the location so the tab follows.
  useEffect(() => {
    const syncHash = () => {
      if (window.location.hash === location.hash) return;
      navigate(
        { pathname: location.pathname, hash: window.location.hash },
        { replace: true },
      );
    };
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [location.hash, location.pathname, navigate]);

  const upcomingEvents = openpeepsApi.useGroupUpcomingEventsFeed(
    group?.id ?? '',
  );
  const pastEvents = openpeepsApi.useGroupPastEventsFeed(group?.id ?? '');
  const [eventsTab, setEventsTab] = useState<'upcoming' | 'past'>('upcoming');

  const capabilities = group?.capabilities;
  const visibilityValue = capabilities?.none?.add?.includes('core-groups-read')
    ? 'public'
    : capabilities?.local?.add?.includes('core-groups-read')
      ? 'local'
      : 'private';
  const postsVisibilityValue = capabilities?.none?.add?.includes(
    'core-posts-read',
  )
    ? 'public'
    : capabilities?.local?.add?.includes('core-posts-read')
      ? 'local'
      : 'private';
  const whoCanJoinValue = capabilities?.local?.add?.includes('core-groups-join')
    ? 'open'
    : 'closed';
  const whoCanPostValue = capabilities?.member?.add?.includes(
    'core-posts-create-*',
  )
    ? 'members'
    : 'admin';
  const whoCanPostEventsValue = capabilities?.member?.remove?.includes(
    'core-posts-create-event',
  )
    ? 'admin'
    : 'members';

  if (groupQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-2xl font-bold">
          {t('groups.notFound', { defaultValue: 'Group not found' })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <GroupHeader group={group} />

      <nav
        aria-label={t('groups.sections.label', {
          defaultValue: 'Group sections',
        })}
        className="border-border flex border-b"
        data-testid="tab-group"
      >
        <TabLink active={tab === 'posts'} hash="">
          {t('groups.sections.posts', { defaultValue: 'Posts' })}
        </TabLink>
        <TabLink
          active={tab === 'events'}
          hash="#events"
          testId="groups-tab-events"
        >
          {t('groups.sections.events', { defaultValue: 'Events' })}
        </TabLink>
        <TabLink
          active={tab === 'resources'}
          hash="#resources"
          testId="groups-tab-resources"
        >
          {t('groups.sections.resources', { defaultValue: 'Resources' })}
        </TabLink>
        <TabLink
          active={tab === 'description'}
          hash="#description"
          testId="groups-tab-description"
        >
          {t('groups.sections.description', { defaultValue: 'Description' })}
        </TabLink>
      </nav>

      {tab === 'posts' && <GroupFeed group={group} />}

      {tab === 'events' && (
        <div>
          <NewEventButton
            visibility="group"
            currentProfile={currentProfile}
            group={group}
            onNavigate={() => navigate('/events/new')}
          />
          <nav
            aria-label={t('groups.eventsTabs.label', {
              defaultValue: 'Event timeframe',
            })}
            className="border-border flex border-b"
          >
            <TabButton
              active={eventsTab === 'upcoming'}
              onClick={() => setEventsTab('upcoming')}
            >
              {t('events.feed.upcoming', { defaultValue: 'Upcoming' })}
            </TabButton>
            <TabButton
              active={eventsTab === 'past'}
              onClick={() => setEventsTab('past')}
            >
              {t('events.feed.past', { defaultValue: 'Past' })}
            </TabButton>
          </nav>
          <EventsView
            query={eventsTab === 'upcoming' ? upcomingEvents : pastEvents}
            agenda={eventsTab}
            list={
              <Feed
                query={eventsTab === 'upcoming' ? upcomingEvents : pastEvents}
                formatSwitch={false}
              />
            }
          />
        </div>
      )}

      {tab === 'resources' && (
        <div>
          <NewResourceButton
            visibility="group"
            currentProfile={currentProfile}
            group={group}
          />
          <ResourceLibrary groupId={group.id} />
        </div>
      )}

      {tab === 'description' && (
        <div className="space-y-2 p-4">
          <section className="border-b py-2">
            <h3 className="text-lg font-semibold">Description</h3>
            <PostMarkdown source={group.description || 'No description yet'} />
          </section>
          <section className="space-y-2 border-b py-2">
            <h3 className="text-lg font-semibold">Details</h3>
            <div>
              <h4 className="font-semibold">Created</h4>
              <p>{new Date(group.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <h4 className="font-semibold">{t('groups.visibility.title')}</h4>
              <p>{t(`groups.visibility.${visibilityValue}.description`)}</p>
            </div>
            <div>
              <h4 className="font-semibold">{t('groups.whoCanJoin.title')}</h4>
              <p>{t(`groups.whoCanJoin.${whoCanJoinValue}.description`)}</p>
            </div>
            <div>
              <h4 className="font-semibold">{t('groups.whoCanPost.title')}</h4>
              <p>
                {t(`groups.whoCanPost.${whoCanPostValue}.description`)}.{' '}
                {t(
                  `groups.whoCanPostEvents.${whoCanPostEventsValue}.description`,
                )}
              </p>
            </div>
            <div>
              <h4 className="font-semibold">
                {t('groups.postsVisibility.title')}
              </h4>
              <p>
                {t(
                  `groups.postsVisibility.${postsVisibilityValue}.description`,
                )}
              </p>
            </div>
          </section>
          <section className="border-b py-2">
            <h3 className="text-lg font-semibold">Rules</h3>
            <PostMarkdown source={group.rules || 'No rules yet'} />
          </section>
        </div>
      )}
    </div>
  );
}

const TabLink = ({
  active,
  hash,
  children,
  testId,
}: {
  active: boolean;
  hash: string;
  children: React.ReactNode;
  testId?: string;
}) => {
  const location = useLocation();
  return (
    <Link
      replace
      to={{ pathname: location.pathname, hash }}
      data-testid={testId}
      aria-current={active ? 'page' : undefined}
      className={`px-4 py-2 text-sm no-underline ${active ? 'border-primary border-b-2 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </Link>
  );
};

const TabButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 text-sm ${active ? 'border-primary border-b-2 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
  >
    {children}
  </button>
);
