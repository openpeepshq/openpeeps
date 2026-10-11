import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useCreateNewJamForm } from '@openpeepshq/react';
import { HeaderActionButton, useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import { EyeOnIcon } from '../../components/icons/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { VisibilitySelector } from '../../components/post/post-form/VisibilitySelector';
import { ProfilesInput } from '../../components/profile/ProfilesInput';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ThemedText } from '../../components/ui/themed-text';

type NewJamProps = MainScreenProps<'CreateNewJam'>;

export const NewJam: React.FC<NewJamProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const {
    postData,
    event,
    isAdmin,
    submitting,
    error,
    selectedModerators,
    patchEvent,
    setWaitingRoom,
    handleModeratorsChange,
    applyAudience,
    handleCreate,
    handleSchedule,
  } = useCreateNewJamForm({ onClose: () => navigation.goBack() });

  useSetPageHeader(
    t('jams.create.title'),
    <HeaderActionButton
      title={t('jams.start.submit')}
      onPress={() => void handleCreate()}
      disabled={submitting}
      loading={submitting}
    />
  );

  return (
    <ThemedView className="grow">
      <KeyboardAwareScrollView
        className="w-full bg-background p-4"
        contentContainerClassName="gap-4"
      >
        <View className="gap-2">
          <Label nativeID="jam-name">{t('jams.form.name')}</Label>
          <Input
            value={event.name ?? ''}
            onChangeText={(name) => patchEvent({ name })}
          />
        </View>

        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <EyeOnIcon size={16} className="text-muted-foreground" />
            <Label nativeID="jam-visibility">
              {t('visibility.event.title')}
            </Label>
          </View>
          <VisibilitySelector
            type="event"
            audienceSetting={{
              visibility: postData.visibility,
              groupId: postData.groupId,
              audience: postData.audience,
            }}
            onChange={applyAudience}
            showDirect
          />
          <ThemedText className="text-xs text-muted-foreground">
            {t('events.form.visibilityNotChangeable')}
          </ThemedText>
        </View>

        <View className="flex-row items-start gap-2">
          <Checkbox
            checked={event.jam?.waitingRoom ?? false}
            onCheckedChange={setWaitingRoom}
          />
          <View className="flex-1">
            <ThemedText className="text-sm">
              {t('events.form.jamWaitingRoom')}
            </ThemedText>
            <ThemedText className="text-xs text-muted-foreground">
              {t('events.form.jamWaitingRoomDescription')}
            </ThemedText>
          </View>
        </View>

        <View className="gap-2">
          <Label nativeID="jam-moderators">
            {t('events.form.jamModerators')}
          </Label>
          <ProfilesInput
            value={selectedModerators}
            onChange={handleModeratorsChange}
            placeholder={t('events.form.jamModeratorsDescription')}
          />
        </View>

        {error ? (
          <ThemedText className="text-sm text-destructive">{error}</ThemedText>
        ) : null}

        {isAdmin ? (
          <Button variant="outline" onPress={handleSchedule}>
            <ThemedText>{t('jams.createFlow.schedule')}</ThemedText>
          </Button>
        ) : null}
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
