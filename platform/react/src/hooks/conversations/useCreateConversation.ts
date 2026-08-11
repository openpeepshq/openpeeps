import { useState } from 'react';
import type {
  PostCreationData,
  PublicProfile,
} from '@openpeepshq/common/types';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

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
  const { openpeepsApi } = useOpenpeeps();
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
      const created = (await createPost(payload)) as { id: string };
      onClose();
      navigate({ type: 'conversation', id: created.id });
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
