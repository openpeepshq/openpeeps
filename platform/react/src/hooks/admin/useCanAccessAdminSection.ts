import {
  adminSections,
  canAccessAdminSection,
  type AdminSectionKey,
} from '@openpeepshq/common/lib';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

/**
 * Local profile roles. Non-local profiles (e.g. remote or SAML) expose no role
 * set, so every admin-section capability check resolves to false for them,
 * mirroring the backend `ensureRoleCapabilities` gating.
 */
export const useAdminRoles = () => {
  const profile = useCurrentProfile();
  return profile?.type === 'local' ? profile.roles : undefined;
};

/**
 * Whether the current profile may access a given admin section. Reuses the
 * shared `adminSections` definitions so Web, native, and route guards agree
 * with the backend's capability checks.
 */
export const useCanAccessAdminSection = (section: AdminSectionKey) => {
  const roles = useAdminRoles();
  const sectionDef = adminSections.find((s) => s.key === section);
  return sectionDef ? canAccessAdminSection(roles, sectionDef) : false;
};
