import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useT, useOpenpeeps } from '../../index';
import {
  Feed,
  GroupFeed,
  GroupHeader,
  NewEventButton,
  PostMarkdown,
  useCurrentProfile,
} from '../../components';
import { routeHandleParam } from '../../lib/routeHandles';
import { LoadingSpinner } from '@openpeepshq/react-ui';

export function GroupShow() {
  const t = useT();
  const navigate = useNavigate();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const { openpeepsApi } = useOpenpeeps();

  const groupQuery = openpeepsApi.useGroupByHandle(handle);
  const group = groupQuery.data;
  const currentProfile = useCurrentProfile();
  const [tab, setTab] = useState<'posts' | 'events' | 'description'>('posts');

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

      <nav className="border-border flex border-b" data-testid="tab-group">
        <TabButton
          active={tab === 'posts'}
          onClick={() => {
            setTab('posts');
            window.history.replaceState(null, '', window.location.pathname);
          }}
        >
          {t('groups.sections.posts', { defaultValue: 'Posts' })}
        </TabButton>
        <TabButton
          active={tab === 'events'}
          onClick={() => {
            setTab('events');
            window.history.replaceState(
              null,
              '',
              `${window.location.pathname}#events`,
            );
          }}
          testId="groups-tab-events"
        >
          {t('groups.sections.events', { defaultValue: 'Events' })}
        </TabButton>
        <TabButton
          active={tab === 'description'}
          onClick={() => {
            setTab('description');
            window.history.replaceState(
              null,
              '',
              `${window.location.pathname}#description`,
            );
          }}
          testId="groups-tab-description"
        >
          {t('groups.sections.description', { defaultValue: 'Description' })}
        </TabButton>
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
          <nav className="border-border flex border-b">
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
          <Feed
            query={eventsTab === 'upcoming' ? upcomingEvents : pastEvents}
          />
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

function TabButton({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`px-4 py-2 text-sm ${active ? 'border-primary border-b-2 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}
