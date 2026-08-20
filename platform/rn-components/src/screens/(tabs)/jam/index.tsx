import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useOpenpeeps } from '@openpeepshq/react';
import { ThemedText } from '~/components/ui/themed-text';
import { MoreVerticalIcon } from '~/components/icons';
import {
  TabScreensHeader,
  NewJamButton,
  EmptyStateContainer,
  JamCard,
} from '~/components/custom';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

export const Jam = ({
  navigation,
}: NativeStackScreenProps<MainStackParamList, 'Jam'>) => {
  const { openpeepsApi } = useOpenpeeps();
  const { data: liveJams, isLoading, refetch } = openpeepsApi.useJams();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  React.useEffect(() => {
    const interval = setInterval(async () => {
      await refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <View className="flex-1 relative">
      <TabScreensHeader
        children={
          <View className="p-2 flex flex-row justify-between items-center">
            <ThemedText className="text-2xl font-semibold">
              Live Jams
            </ThemedText>
            <View className="flex flex-row gap-2 items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size={'icon'} variant={'link'}>
                    <MoreVerticalIcon className="text-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className=" mt-1">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onPress={() => navigation.navigate('UpcomingJams')}
                      className=" flex-row gap-x-2 items-center">
                      <ThemedText>Upcoming Jams</ThemedText>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onPress={() => navigation.navigate('MyJams')}
                      className=" flex-row gap-x-2 items-center">
                      <ThemedText>My Jams</ThemedText>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </View>
          </View>
        }
      />
      <NewJamButton />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ flexGrow: 1 }}
        className="w-full flex bg-background relative p-2">
        {isLoading && <ActivityIndicator size={'small'} />}
        {!isLoading && liveJams?.length === 0 && (
          <EmptyStateContainer type="live-jams" />
        )}
        {!isLoading &&
          liveJams?.map((jam, index) => (
            <JamCard
              key={index}
              jamPost={jam}
            />
          ))}
        <View className="mb-24" />
      </ScrollView>
    </View>
  );
};
