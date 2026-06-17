import {
  MemberExportRow,
  MemberExportStats,
  Profile,
} from '@openpeeps/common/types';
import { toCsvRow } from '@openpeeps/common/lib';
import { allpeepDb } from '../db';
import { baseProfilesMapping, membersExportMapping } from './mapping';
import { expandProfiles } from './helpers';

const guestFilter = `DOC.type != "guest"`;

type MemberExportStatsQueryRow = Profile &
  MemberExportStats & {
    reactionsCount: number;
  };

const emptyStats = (): MemberExportStats => ({
  postsCount: 0,
  reactionsCount: 0,
  lastSeen: null,
});

const toMemberExportStats = (
  row: MemberExportStatsQueryRow | undefined,
): MemberExportStats => ({
  postsCount: row?.postsCount ?? 0,
  reactionsCount: row?.reactionsCount ?? 0,
  lastSeen: row?.lastSeen ?? null,
});

export const listMembersForExport = async (): Promise<MemberExportRow[]> => {
  const { db } = await allpeepDb();

  const [profiles, statsRows] = await Promise.all([
    baseProfilesMapping.filter(guestFilter).all(db).then(expandProfiles),
    membersExportMapping.filter(guestFilter).all(db) as Promise<
      MemberExportStatsQueryRow[]
    >,
  ]);

  const statsById = new Map(
    statsRows.map((row) => [row.id, toMemberExportStats(row)]),
  );

  return profiles.map((profile) => ({
    ...profile,
    ...(statsById.get(profile.id) ?? emptyStats()),
  }));
};

const formatCustomFields = (
  fields: MemberExportRow['fields'],
): string =>
  fields?.map((field) => `${field.name}: ${field.value}`).join('; ') ?? '';

const formatGroups = (memberships: MemberExportRow['memberships']): string =>
  memberships?.map((membership) => membership.group.displayName).join('; ') ??
  '';

const formatRoles = (roles: MemberExportRow['roles']): string =>
  roles?.map((role) => role.displayName || role.key).join('; ') ?? '';

const memberExportHeaders = [
  'Email',
  'Profile Created Date',
  'Handle',
  'Display Name',
  'Roles',
  'Bio',
  'Location',
  'Custom Fields',
  'Groups',
  'Last Seen',
  'Posts',
  'Reactions',
  'Followers',
  'Following',
] as const;

export const exportMembersCsv = async (): Promise<string> => {
  const members = await listMembersForExport();

  return [
    toCsvRow([...memberExportHeaders]),
    ...members.map((member) =>
      toCsvRow([
        member.controllers[0]?.email ?? '',
        member.createdAt,
        member.handle,
        member.displayName ?? '',
        formatRoles(member.roles),
        member.bio ?? '',
        member.location?.text ?? '',
        formatCustomFields(member.fields),
        formatGroups(member.memberships),
        member.lastSeen ?? '',
        member.postsCount,
        member.reactionsCount,
        member.profileStats.followersCount,
        member.profileStats.followingCount,
      ]),
    ),
  ].join('\n');
};
