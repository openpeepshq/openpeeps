import type { Role } from '../types';
import { checkRoleCapabilities } from './capabilitiesHelpers';

/**
 * Admin sidebar sections and the role capabilities required to see each one.
 * All listed capabilities must be present (AND). Matches `ensureRoleCapabilities`
 * on the corresponding admin API routes.
 */
export const adminSections = [
  {
    key: 'members',
    path: '/admin/members',
    capabilities: ['core-accounts-read', 'core-profiles-read'],
  },
  {
    key: 'groups',
    path: '/admin/groups',
    capabilities: ['core-groups-read'],
  },
  {
    key: 'invites',
    path: '/admin/invites',
    capabilities: ['core-inviteLinks-read'],
  },
  {
    key: 'moderation',
    path: '/admin/moderation',
    capabilities: ['core-reports-read'],
  },
  {
    key: 'backups',
    path: '/admin/backups',
    capabilities: ['core-backups-read'],
  },
  {
    key: 'analytics',
    path: '/admin/analytics',
    capabilities: ['core-analytics-read'],
  },
  {
    key: 'apiKeys',
    path: '/admin/api-keys',
    capabilities: ['core-serviceTokens-read'],
  },
  {
    key: 'plugins',
    path: '/admin/plugins',
    capabilities: ['core-plugins-manage'],
  },
  {
    key: 'configuration',
    path: '/admin/configuration',
    capabilities: ['core-config-read'],
  },
  {
    key: 'diagnostics',
    path: '/admin/diagnostics',
    capabilities: ['core-config-read'],
  },
  {
    key: 'database',
    path: '/admin/db',
    capabilities: ['core-db-access'],
  },
] as const;

export type AdminSectionKey = (typeof adminSections)[number]['key'];

export type AdminSection = (typeof adminSections)[number];

export const canAccessAdminSection = (
  roles: Role[] | undefined,
  section: AdminSection,
): boolean =>
  checkRoleCapabilities(roles ?? [], [...section.capabilities]).success;

export const getVisibleAdminSections = (
  roles: Role[] | undefined,
): AdminSection[] =>
  adminSections.filter((section) => canAccessAdminSection(roles, section));

/** True when the profile may see at least one admin menu entry. */
export const canAccessAdminMenu = (roles: Role[] | undefined): boolean =>
  getVisibleAdminSections(roles).length > 0;
