import { useState } from 'react';
import type { ProfileWithMeta } from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useJamContext } from '../../components/jams/JamContext';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import type { JamJoinChoices, JamJoinParams } from './useJamRoom';

export const canAccessJamLobby = (
  profile: ProfileWithMeta | undefined,
  jamPostId: string,
) => {
  if (!profile) return false;
  if (profile.type === 'local') return true;
  return (
    profile.guestData?.resource?.type === 'jams' &&
    profile.guestData.resource.id === jamPostId
  );
};

export type UseJamLobbyArgs = {
  onJoin: (params: JamJoinParams) => void;
};

/**
 * Lobby state shared by web and native: guest-pass gate, join/start label and
 * the token request. Device preview and selection stay in the renderer.
 */
export const useJamLobby = ({ onJoin }: UseJamLobbyArgs) => {
  const t = useT();
  const me = useCurrentProfile();
  const { jamPost, jamEvent, occurrence } = useJamContext();
  const { client, openpeepsApi } = useOpenpeeps();
  const jamStateQuery = openpeepsApi.useJamState(jamPost.id, occurrence);

  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const tokenError = (err: unknown) =>
    apiErrorMessage(
      err,
      t,
      t('jams.lobby.tokenError', { defaultValue: 'Failed to get jam token' }),
    );

  const join = async <C extends JamJoinChoices>(choices: C) => {
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await client.jams.token({
        pathParameters: { id: jamPost.id },
        queryParameters: occurrence ? { occurrence } : undefined,
      });
      if ('error' in res) {
        setError(tokenError(res.error));
        return;
      }
      onJoin({ ...res.data, choices });
    } catch (err) {
      setError(tokenError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    me,
    username: (me ? profileName(me) : '') ?? '',
    jamEvent,
    jamActive: !!jamStateQuery.data?.active,
    canAccess: canAccessJamLobby(me, jamPost.id),
    error,
    setError,
    submitting,
    join,
  };
};
