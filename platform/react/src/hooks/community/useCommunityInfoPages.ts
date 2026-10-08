import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useServerInfo } from '../../components/server-data/context';

/** Copy and visitor links shared by the About and Code of Conduct pages. */
export const useCommunityInfoPages = () => {
  const serverInfo = useServerInfo();
  const currentProfile = useCurrentProfile();
  return {
    communityName: serverInfo.communityConfig?.info?.name ?? 'AllPeep',
    aboutPage:
      serverInfo.communityConfig?.content?.aboutPage ??
      'This is a community hosted on AllPeep.',
    codeOfConduct:
      serverInfo.communityConfig?.content?.codeOfConduct ??
      'This community has not published a code of conduct yet.',
    /** Visitors get sign-up / public feed links; members do not. */
    showVisitorLinks: !currentProfile,
    openRegistrations:
      !!serverInfo.communityConfig?.settings?.openRegistrations,
    publicContent: !!serverInfo.publicContent,
  };
};
