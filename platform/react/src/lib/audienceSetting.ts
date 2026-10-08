import type {
  AudienceSetting,
  PostCreationData,
  PublicProfile,
} from '@openpeepshq/common/types';

/**
 * Apply a picker result to a draft. Direct posts always include the author
 * so they stay visible to them; other visibilities carry no audience.
 */
export const applyAudienceSetting = <T extends PostCreationData>(
  postData: T,
  settings: AudienceSetting,
  me: PublicProfile | null | undefined,
): T => {
  const audience = settings.audience ?? undefined;
  const includesMe = audience?.some((p) => p.id === me?.id);
  return {
    ...postData,
    visibility: settings.visibility,
    groupId: settings.groupId ?? undefined,
    audience:
      settings.visibility === 'direct'
        ? includesMe
          ? audience
          : [...(audience ?? []), ...(me ? [me] : [])]
        : undefined,
  };
};
