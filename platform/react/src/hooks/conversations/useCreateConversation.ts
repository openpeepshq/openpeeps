import { useState } from 'react';
import type {
  PostCreationData,
  PublicPost,
  PublicProfile,
} from '@openpeepshq/common/types';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

/** After a 1-1 send is appended to an existing thread, open that thread's root. */
export const conversationIdAfterCreate = (
  created: { id: string; inReplyToId?: string | null },
  thread: { id: string }[] | undefined,
): string => {
  if (!created.inReplyToId) return created.id;
  return thread?.[0]?.id ?? created.id;
};

export type UseCreateConversationArgs = {
  profiles?: PublicProfile[];
  message?: string;
  skipProfileSelection?: boolean;
  onClose: () => void;
};

/**
 * Non-DOM conversation-create controller (steps + submit).
 */
export const useCreateConversation = ({
  profiles: initialProfiles = [],
  message: initialMessage = '',
  skipProfileSelection = false,
  onClose,
}: UseCreateConversationArgs) => {
  const navigate = useNavigate();
  const me = useCurrentProfile();
  const { openpeepsApi, client, queryClient } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();

  const [step, setStep] = useState(skipProfileSelection ? 2 : 1);
  const [selectedProfiles, setSelectedProfiles] =
    useState<PublicProfile[]>(initialProfiles);
  const [message, setMessage] = useState(initialMessage);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!me || selectedProfiles.length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      const payload: PostCreationData = {
        visibility: 'direct',
        type: 'note',
        audience: [me, ...selectedProfiles],
        data: {
          type: 'note',
          content: message.trim(),
        },
      };
      const created = (await createPost(payload)) as PublicPost;
      const found = created.inReplyToId
        ? await client.conversations.findById({
            pathParameters: { id: created.id },
          })
        : undefined;
      const thread = found && 'data' in found ? found.data : undefined;
      onClose();
      navigate({
        type: 'conversation',
        id: conversationIdAfterCreate(created, thread),
      });
      void queryClient.invalidateQueries({
        queryKey: client.conversations.list.queryKey({}),
        refetchType: 'all',
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    me,
    step,
    setStep,
    selectedProfiles,
    setSelectedProfiles,
    message,
    setMessage,
    submitting,
    error,
    send,
  };
};
