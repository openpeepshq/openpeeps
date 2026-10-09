import React, { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MessageSquareIcon } from '../icons/index';
import { cn } from '../../lib/utils';
import { JamChatDrawer } from './JamChatDrawer';

export interface JamObserverShellProps {
  children: ReactNode;
}

/** Observer layout wrapper with read-only persisted chat drawer. */
export const JamObserverShell = ({ children }: JamObserverShellProps) => {
  const { t } = useTranslation();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <View className="relative flex-1 overflow-hidden">
      <View className="min-h-0 flex-1">{children}</View>
      <View className="absolute bottom-4 right-4 z-20">
        <Pressable
          accessibilityLabel={t('jams.drawer.chatTitle')}
          accessibilityRole="button"
          onPress={() => setChatOpen((open) => !open)}
          className={cn(
            'size-10 items-center justify-center rounded-full',
            chatOpen ? 'bg-primary/15' : 'bg-card'
          )}
        >
          <MessageSquareIcon
            size={20}
            className={chatOpen ? 'text-primary' : 'text-foreground'}
          />
        </Pressable>
      </View>
      <JamChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        readOnly
      />
    </View>
  );
};
