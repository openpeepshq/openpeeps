import React, { forwardRef, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ImageSourcePropType,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  BottomSheetModal,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from '@gorhom/bottom-sheet';
import { ChevronRightIcon } from '~/components/icons';
import {
  AudienceSetting,
  PublicProfile,
  VisibilityType,
  type GroupWithMeta,
} from '@openpeeps/common';
import { ThemedText } from '~/components/ui/themed-text';
import { useOpenpeeps } from '@openpeeps/react';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import { useAudienceChoices } from './constants';
import { GroupNameFromId } from '../../groups/group-name-from-id';
import { ProfileAvatar } from '../../profile/profile-avatar';
import { ProfilePickerSheet } from '../profile/profile-picker-sheet';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface VisibilitySheetProps {
  onSubmit: (audienceSetting: AudienceSetting) => void;
  type: 'event' | 'post';
  audienceSetting: AudienceSetting;
  showDirect?: boolean;
}

export const VisibilitySheet = forwardRef<
  BottomSheetModal,
  VisibilitySheetProps
>(({ type, onSubmit, audienceSetting, showDirect = false }, ref) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();

  const {
    data: { publicContent },
  } = openpeepsApi.useServerInfo() && { data: { publicContent: false } };

  const audiencePickerModalRef = useRef<BottomSheetModal>(null);
  const { height } = Dimensions.get('window');

  const options = useAudienceChoices(type)
    .filter(c => c.value !== 'public' || publicContent)
    .filter(c => c.value !== 'direct' || showDirect);

  const [selectedAudience, setSelectedAudience] =
    useState<AudienceSetting>(audienceSetting);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [isShowSelectGroup, setIsShowSelectGroup] = useState(false);

  const { data: server } = openpeepsApi.useServerInfo();
  const { t } = useTranslation();
  const prefix = `visibility.${type}.`;
  const i = (key: string) => t(`${prefix}${key}`);

  const setSelectedProfiles = (profiles: PublicProfile[]) => {
    setSelectedAudience({
      visibility: 'direct',
      audience: profiles,
      groupId: undefined,
    });
    audiencePickerModalRef.current?.dismiss();
  };

  const handleOptionSelect = (option: VisibilityType) => {
    if (option === 'group') {
      setIsShowSelectGroup(true);
    } else if (option === 'direct') {
      audiencePickerModalRef.current?.present();
    } else {
      setSelectedAudience({
        visibility: option,
        groupId: undefined,
      });
    }
  };

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1 p-4 relative">
        {isShowSelectGroup ? (
          <>
            <Text className="text-xl font-bold mb-4 text-foreground text-center">
              {t('posts.form.selectGroup')}
            </Text>
            <ScrollView
              style={{
                height: height * 0.8,
              }}>
              {currentProfile?.memberships
                .map(m => m.group as GroupWithMeta)
                .map(group => (
                  <TouchableOpacity
                    key={group.id}
                    className="flex-row items-center justify-between py-3"
                    onPress={() => setSelectedGroupId(group.id)}>
                    <View className="flex-row items-center flex-1">
                      <Image
                        source={
                          (group.avatar as ImageSourcePropType) ??
                          server?.communityConfig.theme.icon
                        }
                        className="w-12 h-12 rounded-full mr-3"
                      />
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">
                          {group.displayName}
                        </Text>
                      </View>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center border-2 ${selectedGroupId === group.id
                        ? 'border-foreground'
                        : 'border-muted-foreground'
                        }`}>
                      <View
                        className={`w-4 h-4 rounded-full ${selectedGroupId === group.id && 'bg-primary'
                          }`}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <SheetFooter
              onCancel={() => setIsShowSelectGroup(false)}
              onConfirm={() => {
                setSelectedAudience({
                  visibility: 'group',
                  groupId: selectedGroupId,
                });
                setIsShowSelectGroup(false);
              }}
              confirmText={t('common.form.save')}
            />
          </>
        ) : (
          <>
            <Text className="text-xl font-bold mb-6 text-primary mx-auto">
              {i('title')}
            </Text>
            {options.map(option => (
              <TouchableWithoutFeedback
                key={option.value}
                className="flex-row items-center justify-between py-5"
                onPress={() =>
                  handleOptionSelect(option.value as VisibilityType)
                }>
                <View className="w-full flex-row items-center justify-between py-4">
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-full bg-muted items-center justify-center mr-3">
                      <option.icon size={20} className="text-foreground" />
                    </View>
                    <View className="flex-row items-center gap-4">
                      <View>
                        <ThemedText className="text-base font-semibold">
                          {i(`${option.value}.title`)}
                        </ThemedText>
                        {option.description && (
                          <Text className="text-sm text-muted-foreground mt-0.5">
                            {i(`${option.value}.description`)}
                          </Text>
                        )}
                        {option.value === 'group' && selectedGroupId && (
                          <Text className="text-sm text-muted-foreground mt-0.5">
                            <GroupNameFromId groupId={selectedGroupId} />
                          </Text>
                        )}
                        {option.value === 'direct' &&
                          selectedAudience.visibility === 'direct' &&
                          selectedAudience.audience && (
                            <View className="flex-row items-center gap-2 pl-2">
                              {selectedAudience.audience.map(a => (
                                <ProfileAvatar
                                  key={a.id}
                                  profile={a}
                                  className="size-4 -ml-3"
                                />
                              ))}
                            </View>
                          )}
                      </View>
                      {['group', 'direct'].includes(option.value) && (
                        <ChevronRightIcon className="text-foreground" />
                      )}
                    </View>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center border-2 ${selectedAudience.visibility === option.value
                      ? 'border-primary'
                      : 'border-secondary'
                      }`}>
                    <View
                      className={`w-4 h-4 rounded-full ${selectedAudience.visibility === option.value &&
                        'bg-primary'
                        }`}
                    />
                  </View>
                </View>
              </TouchableWithoutFeedback>
            ))}
            <SheetFooter
              onCancel={() => bottomSheetClose(ref)}
              onConfirm={() => {
                onSubmit(selectedAudience);
                bottomSheetClose(ref);
              }}
            />
          </>
        )}
      </View>
      <ProfilePickerSheet
        ref={audiencePickerModalRef}
        onSelect={setSelectedProfiles}
        title="Select Audience"
        initialProfiles={selectedAudience.audience ?? []}
        editMode
      />
    </BaseSheet>
  );
});
