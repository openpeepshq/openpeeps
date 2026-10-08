import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOpenpeeps } from '@openpeepshq/react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PhoneOffIcon,
} from '~/components/icons';
import { CardEvent } from '~/components/post/types/event/CardEvent';
import { ThemedText } from '~/components/ui/themed-text';

export const LiveJamsSection = () => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const liveJamsQuery = openpeepsApi.useJams();
  const [open, setOpen] = useState(true);

  return (
    <View className="mb-8">
      <Pressable
        className="mb-3 flex-row items-center gap-3 px-1"
        onPress={() => setOpen((value) => !value)}
      >
        {open ? (
          <ChevronDownIcon size={20} className="text-foreground" />
        ) : (
          <ChevronRightIcon size={20} className="text-foreground" />
        )}
        <ThemedText className="text-lg font-semibold">
          {t('jams.liveJams')}
        </ThemedText>
      </Pressable>

      {open ? (
        liveJamsQuery.isLoading ? (
          <ActivityIndicator size="small" />
        ) : (liveJamsQuery.data ?? []).length ? (
          <View className="gap-2">
            {(liveJamsQuery.data ?? []).map((jam) => (
              <CardEvent key={jam.id} post={jam} showEventDate={false} />
            ))}
          </View>
        ) : (
          <View className="h-72 w-full flex-col items-center justify-center gap-y-6">
            <PhoneOffIcon size={60} className="text-muted-foreground" />
            <ThemedText>{t('jams.noLiveJams')}</ThemedText>
          </View>
        )
      ) : null}
    </View>
  );
};
