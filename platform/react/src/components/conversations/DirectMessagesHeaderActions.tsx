import { Plus } from 'lucide-react';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useCreateNewConversation } from './CreateNewConversationContext';

export function DirectMessagesHeaderActions() {
  const t = useT();
  const { openCreateConversation } = useCreateNewConversation();

  return (
    <Button
      variant="default"
      title={t('conversations.newMessage', { defaultValue: 'New message' })}
      action={() => openCreateConversation()}
    >
      <Plus className="size-4" />
      {t('conversations.newMessage', { defaultValue: 'New message' })}
    </Button>
  );
}
