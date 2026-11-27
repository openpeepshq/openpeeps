import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PublicPost } from '@openpeepshq/common/types';
import { MainStackParamList } from '../../components/navigation/types/index';
import { useOpenpeeps } from '@openpeepshq/react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSetPageHeader } from '../../components/layout';
import { Input } from '../../components/ui/input';
import { Feed } from '../../components/post/index';

type DraftsScreenProps = NativeStackScreenProps<MainStackParamList, 'Drafts'>;

// The filter matches the visible text of every post type: the content, plus
// the name (events) / title (articles) fields the feed row headlines. The
// headline field differs per post type, so read it via a type guard rather
// than on the union directly.
const matches = (post: PublicPost, needle: string): boolean => {
  const data = post.data;
  const headline =
    (data && 'title' in data ? data.title : undefined) ??
    (data && 'name' in data ? data.name : undefined) ??
    '';
  const haystack = `${data?.content ?? ''} ${headline}`.toLowerCase();
  return haystack.includes(needle);
};

/**
 * Lists the current user's draft posts. Drafts only ever exist for their
 * author (enforced server-side), so the list is small and fully local —
 * filtering the already-fetched pages client-side keeps the text box
 * responsive without a server round (mirrors web `FeedsDrafts`). Tapping a
 * draft opens the post screen, where the menu offers Publish / Edit / Delete.
 */
export const FeedsDrafts: React.FC<DraftsScreenProps> = () => {
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();

  const query = openpeepsApi.useMyDrafts();
  const [filter, setFilter] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);

  const filtered = React.useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle || !query.data) return query;
    const pages = query.data.pages.map((page) =>
      page.filter((post) => matches(post, needle))
    );
    return { ...query, data: { ...query.data, pages } };
  }, [query, filter]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([query.refetch()]);
    setRefreshing(false);
  }, [query]);

  useSetPageHeader(t('common.entities.drafts', { defaultValue: 'Drafts' }));

  return (
    <>
      <View className="border-border bg-background border-b px-4 py-3">
        <Input
          className="max-w-sm"
          placeholder={t('feeds.drafts.filter', {
            defaultValue: 'Filter your drafts…',
          })}
          value={filter}
          onChangeText={setFilter}
          testID="drafts-filter"
        />
      </View>
      <ScrollView
        className="bg-background"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Feed query={filtered} formatSwitch={false} />
      </ScrollView>
    </>
  );
};
