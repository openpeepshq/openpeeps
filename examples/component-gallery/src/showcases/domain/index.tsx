import type { ReactElement, ReactNode } from 'react';
import {
  Avatar,
  ProfileBadge,
  ProfileCard,
  ProfileHeader,
} from '@openpeepshq/react/components/profile';
import { GroupAvatar, GroupCard } from '@openpeepshq/react/components/groups';
import {
  FeedArticle,
  FeedEvent,
  FeedNote,
  FeedPoll,
  PostInfoHeader,
} from '@openpeepshq/react/components/post';
import { TypedNotification } from '@openpeepshq/react/components/notifications';
import { ConversationMessageBubble } from '@openpeepshq/react/components/conversations';
import { OpenpeepsMarkdown } from '@openpeepshq/react/components/markdown';
import { ShowcaseSection } from '@/components/ShowcaseSection';
import {
  fixtureAnnouncementNotification,
  fixtureArticlePost,
  fixtureEventPost,
  fixtureFollowNotification,
  fixtureGroup,
  fixtureMe,
  fixtureNeighbor,
  fixtureNotePost,
  fixturePollPost,
  fixtureProfile,
} from '@/fixtures/domain';
import { showcase } from '@/types';

const PostCard = ({
  children,
  post,
}: {
  children: ReactNode;
  post: typeof fixtureNotePost;
}): ReactElement => (
  <div className="border-border max-w-xl rounded-lg border">
    <div className="px-4 pt-2">
      <PostInfoHeader post={post} showMenu={false} />
    </div>
    <div className="px-4 pb-4">{children}</div>
  </div>
);

export const domainShowcases = [
  showcase(
    'organisms',
    'posts',
    'Posts',
    () => (
      <ShowcaseSection
        title="Posts"
        description="Feed body components without interactive action bars."
      >
        <div className="space-y-4">
          <PostCard post={fixtureNotePost}>
            <FeedNote post={fixtureNotePost} />
          </PostCard>
          <PostCard post={fixtureArticlePost}>
            <FeedArticle post={fixtureArticlePost} />
          </PostCard>
          <PostCard post={fixtureEventPost}>
            <FeedEvent post={fixtureEventPost} />
          </PostCard>
          <PostCard post={fixturePollPost}>
            <FeedPoll post={fixturePollPost} interactive={false} />
          </PostCard>
          <div className="max-w-xl">
            <ConversationMessageBubble message={fixtureNotePost} />
          </div>
        </div>
      </ShowcaseSection>
    ),
    'Note, article, event, and poll bodies with fixture data.',
  ),
  showcase(
    'organisms',
    'people',
    'People',
    () => (
      <ShowcaseSection title="People">
        <div className="space-y-4">
          <div className="border-border max-w-xl overflow-hidden rounded-lg border">
            <ProfileHeader profile={fixtureMe} isCurrentProfile />
          </div>
          <div className="border-border max-w-xl overflow-hidden rounded-lg border">
            <ProfileCard profile={fixtureNeighbor} showAction={false} />
            <ProfileCard profile={fixtureProfile} showAction={false} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Avatar profile={fixtureProfile} size={3} />
            <Avatar profile={fixtureNeighbor} size={4} />
            <ProfileBadge profile={fixtureNeighbor} />
          </div>
        </div>
      </ShowcaseSection>
    ),
    'Profile header, cards, avatar, and badge.',
  ),
  showcase('organisms', 'groups', 'Groups', () => (
    <ShowcaseSection title="Groups">
      <div className="border-border max-w-xl overflow-hidden rounded-lg border">
        <GroupCard group={fixtureGroup} showAction={false} unreadCount={3} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <GroupAvatar group={fixtureGroup} size={4} />
        <span className="text-sm font-medium">{fixtureGroup.displayName}</span>
      </div>
    </ShowcaseSection>
  )),
  showcase('organisms', 'notifications', 'Notifications', () => (
    <ShowcaseSection title="Notifications">
      <div className="border-border max-w-xl overflow-hidden rounded-lg border">
        <TypedNotification notification={fixtureFollowNotification} />
        <TypedNotification notification={fixtureAnnouncementNotification} />
      </div>
    </ShowcaseSection>
  )),
  showcase('organisms', 'markdown', 'Markdown', () => (
    <ShowcaseSection
      title="Markdown"
      description="Static render mode (no live link previews)."
    >
      <div className="border-border max-w-xl rounded-lg border p-4">
        <OpenpeepsMarkdown
          source={`# Community update

Thanks @${fixtureNeighbor.handle} for organizing the cleanup.

- Bring gloves
- Meet at the park gate
- #cleanup`}
          mentions={[
            {
              text: `@${fixtureNeighbor.handle}`,
              profile: fixtureNeighbor,
            },
          ]}
        />
      </div>
    </ShowcaseSection>
  )),
  showcase(
    'organisms',
    'chrome',
    'Chrome',
    () => (
      <ShowcaseSection title="Chrome">
        <div className="border-border bg-background max-w-sm rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Avatar profile={fixtureMe} size={2.5} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {fixtureMe.displayName}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                @{fixtureMe.handle}
              </p>
            </div>
          </div>
          <nav className="mt-4 space-y-1 text-sm">
            {['Local feed', 'Explore', 'Notifications', 'Groups'].map(
              (label) => (
                <div
                  key={label}
                  className="hover:bg-muted rounded-md px-2 py-1.5"
                >
                  {label}
                </div>
              ),
            )}
          </nav>
        </div>
      </ShowcaseSection>
    ),
    'Lightweight shell pieces using fixture identity.',
  ),
];
