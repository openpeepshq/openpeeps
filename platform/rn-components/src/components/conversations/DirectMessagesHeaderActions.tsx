import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '../icons/index';
import { Button } from '../ui/button';
import { ThemedText } from '../ui/themed-text';
import { useCreateNewConversation } from './CreateNewConversationContext';

export const DirectMessagesHeaderActions = () => {
  const { t } = useTranslation();
  const { openCreateConversation } = useCreateNewConversation();

  return (
    <Button
      size="sm"
      className="flex-row items-center gap-x-1"
      accessibilityLabel={t('conversations.newMessage')}
      onPress={() => openCreateConversation()}
    >
      <PlusIcon size={16} className="text-primary-foreground" />
      <ThemedText className="text-primary-foreground">
        {t('conversations.newMessage')}
      </ThemedText>
    </Button>
  );
};
