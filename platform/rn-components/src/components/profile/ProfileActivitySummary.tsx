import React, { type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type {
  ProfileActivitySummary as ProfileActivitySummaryData,
  PublicProfile,
} from '@openpeepshq/common/types';
import { useOpenpeeps } from '@openpeepshq/react';
import { RssIcon } from '~/components/icons';
import { FeedPost } from '~/components/post/FeedPost';
import { ThemedText } from '~/components/ui/themed-text';

export interface ProfileActivitySummaryProps {
  profile: PublicProfile;
}

const CountCard = ({ value, label }: { value: number; label: string }) => (
  <View className="min-w-[30%] flex-1 rounded-xl border border-border bg-background p-4">
    <ThemedText className="text-2xl font-semibold tracking-tight">
      {value.toLocaleString()}
    </ThemedText>
    <ThemedText className="mt-1 text-sm text-muted-foreground">
      {label}
    </ThemedText>
  </View>
);

const CountSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <View className="px-4 pb-4">
    <ThemedText className="pb-2 text-sm font-medium">{title}</ThemedText>
    <View className="flex-row flex-wrap gap-3">{children}</View>
  </View>
);

const SummaryBody = ({ summary }: { summary: ProfileActivitySummaryData }) => {
  const { t } = useTranslation();

  return (
    <View className="flex-col">
      <CountSection title={t('profile.activity.yourContent')}>
        <CountCard
          value={summary.postsCount}
          label={t('profile.activity.postsCount')}
        />
        <CountCard
          value={summary.repliesCount}
          label={t('profile.activity.repliesCount')}
        />
        <CountCard
          value={summary.eventsCount}
          label={t('profile.activity.eventsCount')}
        />
      </CountSection>

      <CountSection title={t('profile.activity.yourActions')}>
        <CountCard
          value={summary.reactionsGiven}
          label={t('profile.activity.reactionsGiven')}
        />
        <CountCard
          value={summary.repostsCount}
          label={t('profile.activity.repostsCount')}
        />
        <CountCard
          value={summary.rsvpsCount}
          label={t('profile.activity.rsvpsCount')}
        />
        <CountCard
          value={summary.bookmarksCount}
          label={t('profile.activity.bookmarksCount')}
        />
        <CountCard
          value={summary.groupsCount}
          label={t('profile.activity.groupsCount')}
        />
      </CountSection>

      <CountSection title={t('profile.activity.received')}>
        <CountCard
          value={summary.reactionsReceived}
          label={t('profile.activity.reactionsReceived')}
        />
        <CountCard
          value={summary.repliesReceived}
          label={t('profile.activity.repliesReceived')}
        />
        <CountCard
          value={summary.repostsReceived}
          label={t('profile.activity.repostsReceived')}
        />
      </CountSection>

      <ThemedText className="px-4 pb-2 text-sm font-medium">
        {t('profile.activity.topPosts')}
      </ThemedText>

      {summary.topPosts.length ? (
        <View className="flex-col gap-0.5 bg-muted">
          {summary.topPosts.map((post) => (
            <FeedPost key={post.id} post={post} showReplyTo />
          ))}
        </View>
      ) : (
        <View className="h-64 w-full flex-col items-center justify-center gap-y-4">
          <RssIcon size={64} className="text-muted-foreground" />
          <ThemedText className="text-sm text-muted-foreground">
            {t('profile.activity.emptyTopPosts')}
          </ThemedText>
        </View>
      )}
    </View>
  );
};

export const ProfileActivitySummary = ({
  profile,
}: ProfileActivitySummaryProps) => {
  const { openpeepsApi } = useOpenpeeps();
  const query = openpeepsApi.useProfileActivitySummary(profile.id);

  if (query.isLoading) return <ActivityIndicator size="small" />;
  return query.data ? <SummaryBody summary={query.data} /> : null;
};
