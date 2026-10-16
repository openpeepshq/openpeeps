import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useOpenpeeps, useServerInfo } from '@openpeepshq/react';
import { useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import {
  ChevronRightIcon,
  MoreHorizontalIcon,
} from '../../components/icons/index';
import {
  CreateNewJam,
  LiveJamsSection,
  LivekitUnavailableNotice,
} from '../../components/jams/index';
import { MainStackParamList } from '../../components/navigation/types/index';
import { EventsFeed } from '../../components/post/feed/events/EventsFeed';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { ThemedText } from '../../components/ui/themed-text';

interface Props {
  /** When true, scope to the current user's jams. */
  my?: boolean;
}

const TabButton = ({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: string;
}) => (
  <Pressable
    onPress={onPress}
    className={`px-4 py-2 ${active ? 'border-b-2 border-primary' : ''}`}
  >
    <ThemedText
      className={`text-sm ${active ? 'font-semibold' : 'text-muted-foreground'}`}
    >
      {children}
    </ThemedText>
  </Pressable>
);

export const JamsIndex = ({ my = false }: Props) => {
  const { t } = useTranslation();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const livekitEnabled = !!serverInfo.jams?.livekit?.enabled;

  const upcoming = my
    ? openpeepsApi.useMyUpcomingJamsFeed()
    : openpeepsApi.useUpcomingJamsFeed();
  const past = my
    ? openpeepsApi.useMyPastJamsFeed()
    : openpeepsApi.usePastJamsFeed();
  const activeQuery = tab === 'upcoming' ? upcoming : past;

  const headerActions = my ? (
    <Button variant="link" onPress={() => navigation.goBack()}>
      <ThemedText className="text-sm text-primary">
        {t('navigation.jams')}
      </ThemedText>
    </Button>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="link">
          <MoreHorizontalIcon className="text-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mt-1">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onPress={() => navigation.navigate('MyJams')}
            className="flex-row items-center gap-x-2"
          >
            <ChevronRightIcon size={16} className="text-foreground" />
            <ThemedText>{t('navigation.myJams')}</ThemedText>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const body = (
    <ScrollView
      contentContainerClassName="grow"
      className="w-full bg-background p-4"
    >
      {!livekitEnabled ? (
        <LivekitUnavailableNotice className="mb-4 text-sm text-destructive" />
      ) : null}
      {!my && livekitEnabled ? <LiveJamsSection /> : null}

      <View
        accessibilityLabel={t('jams.feed.label')}
        className="mb-4 flex-row border-b border-border"
      >
        <TabButton
          active={tab === 'upcoming'}
          onPress={() => setTab('upcoming')}
        >
          {t('jams.feed.upcoming')}
        </TabButton>
        <TabButton active={tab === 'past'} onPress={() => setTab('past')}>
          {t('jams.feed.past')}
        </TabButton>
      </View>
      <EventsFeed query={activeQuery} type="jam" />
    </ScrollView>
  );

  useSetPageHeader(
    my ? t('navigation.myJams') : t('navigation.jams'),
    headerActions
  );

  return (
    <ThemedView className="relative flex-1">
      {livekitEnabled ? <CreateNewJam /> : null}
      {body}
    </ThemedView>
  );
};
