import { adminSections, canAccessAdminSection } from '@openpeepshq/common/lib';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

const diagnosticsSection = adminSections.find(
  (section) => section.key === 'diagnostics',
);

/** Admins who can open Diagnostics can see why LiveKit failed. */
export const useCanDiagnoseLivekit = () => {
  const profile = useCurrentProfile();
  if (!diagnosticsSection) return false;
  const roles = profile?.type === 'local' ? profile.roles : undefined;
  return canAccessAdminSection(roles, diagnosticsSection);
};
