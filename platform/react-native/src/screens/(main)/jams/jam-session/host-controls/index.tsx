import {KeyboardAvoidingView, ScrollView, View} from 'react-native';
import React from 'react';
import {GenericHeader} from '../../../../../components/custom';
import {XIcon} from '../../../../../components/icons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {MainStackParamList} from '../../../../../components/navigation/types';
import {ThemedText} from '../../../../../components/ui/themed-text';
import {ThemedSafeAreaView} from '../../../../../components/ui/themed-safe-area-view';

export const JamHostControls = ({
  navigation,
}: NativeStackScreenProps<MainStackParamList, 'JamHostControls'>) => {
  const scrollViewRef = React.useRef<ScrollView>(null);

  return (
    <ThemedSafeAreaView className="flex-1 relative">
      <GenericHeader
        hideBackButton={true}
        title="Host Controls"
        rightType="icon"
        rightButtonIcon={<XIcon className="text-foreground" />}
        onRightButtonPress={() => {
          navigation.pop();
        }}
      />
      <KeyboardAvoidingView style={{flex: 1}} behavior="padding">
        {/* {isLoading && <ActivityIndicator size={'small'} />} */}
        <ScrollView
          ref={scrollViewRef}
          className="p-2 w-full flex-1"
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({animated: true})
          }>
          <ThemedText className="text-muted-foreground my-4">
            Use these host settings to keep control of your jam. Only host have
            access to these controls.
          </ThemedText>

          <View>
            <ThemedText className="text-muted-foreground text-lg underline my-4 pb-2">
              JAM MODERATION
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedSafeAreaView>
  );
};
