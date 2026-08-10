import React, { useEffect } from 'react';
import { ChevronDownIcon } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { View } from 'react-native';
import { AudienceSetting } from '@openpeepshq/common';
import { VisibilitySheet } from '../../modals/post/visibility-sheet';
import { useRef, useState } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { VisibilityDisplay } from '../pieces/VisibilityDisplay';

export const VisibilityInput = ({
  audienceSetting,
  onChange,
  showDirect = false,
  type = 'post',
  disabled = false,
}: {
  audienceSetting: AudienceSetting;
  onChange: (audienceSetting: AudienceSetting) => void;
  showDirect?: boolean;
  type?: 'post' | 'event';
  disabled?: boolean;
}) => {
  const visibilityModalRef = useRef<BottomSheetModal>(null);
  const showVisibilitySheet = () => {
    visibilityModalRef.current?.present();
  };

  const [newAudienceSetting, setNewAudienceSetting] =
    useState<AudienceSetting>(audienceSetting);

  useEffect(() => {
    setNewAudienceSetting(audienceSetting);
  }, [audienceSetting]);

  return (
    <View className="flex-row items-center p-4">
      <TouchableOpacity
        disabled={disabled}
        onPress={showVisibilitySheet}
        className="flex-1 flex-row items-center">
        <VisibilityDisplay audienceSetting={newAudienceSetting} type={type} />
        {!disabled && (
          <ChevronDownIcon size={20} className="ml-2 text-foreground" />
        )}
      </TouchableOpacity>
      <VisibilitySheet
        type={type}
        ref={visibilityModalRef}
        onSubmit={(setting) => {
          setNewAudienceSetting(setting);
          onChange(setting);
        }}
        audienceSetting={newAudienceSetting}
        showDirect={showDirect}
      />
    </View>
  );
};
