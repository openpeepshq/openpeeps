import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { ThemedView } from '~/components/ui/themed-view';
import { MainScreenProps } from '~/components/navigation/types';
import { useNewConversationStore } from '~/stores/useNewConversationStore';
import { TouchableOpacity } from 'react-native';
import { GenericHeader } from '~/components/custom/headers';
import {
  SendHorizonalIcon,
} from '~/components/icons';
import { useOpenpeeps } from '@openpeeps/react';
import { ThemedText } from '~/components/ui/themed-text';
import { Profile, PublicProfile } from '@openpeeps/common';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';

type DraftMessageProps = MainScreenProps<'DraftMessage'>;

export const DraftMessage = ({ navigation }: DraftMessageProps) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { members, clearMembers, contnt, setContt } = useNewConversationStore();
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const sendMessage = openpeepsApi.createPostAction();

  const handleSendMessage = async () => {
    if (!content.trim()) {
      return;
    }
    try {
      setIsSending(true);
      const audience = [...members, currentProfile as Profile].map(profile => ({
        ...profile,
        memberships: [],
      })) as PublicProfile[];
      sendMessage({
        visibility: 'direct',
        audience,
        data: {
          type: 'note',
          content: content,
        },
        type: 'note',
      })
        .then(data => {
          setContent('');
          setContt('');
          clearMembers();
          navigation.pop();
          navigation.pop();
          navigation.navigate('Conversation', { id: data.id });
        })
        .catch(error => {
          console.error('Failed to send message:', error);
        })
        .finally(() => setIsSending(false));
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (contnt) {
      setContent(contnt);
    }
  }, [contnt]);

  return (
    <ThemedSafeAreaView className="flex-1 relative">
      <GenericHeader title={'Draft Message'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          ref={scrollViewRef}
          className="p-2 w-full flex-1"
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }>
          <View className="p-4">
            <ThemedText>
              New message to :{' '}
              {[...members, currentProfile as Profile]
                .map(member => member.displayName || `@${member.handle}`)
                .join(', ')}
            </ThemedText>
          </View>
        </ScrollView>

        <ThemedView className="flex-row items-center p-2 border-t border-border bg-background">
          {/* <TouchableOpacity
            className={'p-2 rounded-full bg-primary'}
            onPress={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <XIcon /> : <PlusIcon />}
          </TouchableOpacity> */}
          <TextInput
            className="flex-1 px-4 py-2 pb-4 text-lg text-foreground bg-muted rounded-2xl mx-2"
            placeholder="Type a message..."
            placeholderTextColor="#666"
            multiline
            value={content}
            onChangeText={setContent}
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!content.trim() || isSending}
            className={`p-2 rounded-full ${content.trim() ? 'bg-primary' : 'bg-muted'
              }`}>
            {isSending ? (
              <ActivityIndicator size={'small'} />
            ) : (
              <SendHorizonalIcon />
            )}
          </TouchableOpacity>
        </ThemedView>
      </KeyboardAvoidingView>
    </ThemedSafeAreaView>
  );
};
