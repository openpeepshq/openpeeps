import type { FetchClient } from '@openpeeps/fetch-client';
import type {
    CreateGroupRequest,
    GroupData,
    GroupMember,
    GroupRoleData,
    GroupWithMeta,
    PublicProfile,
    SuccessResponse,
} from '@openpeeps/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

export const groups = (rawClient: FetchClient) => ({
    create: allpeepPayloadEndpoint<GroupWithMeta, CreateGroupRequest>(
        rawClient,
        '/groups',
        'post',
    ),
    list: allpeepNoPayloadEndpoint<GroupWithMeta[]>(
        rawClient,
        '/groups',
    ),
    findById: allpeepNoPayloadEndpoint<GroupWithMeta, { id: string }>(
        rawClient,
        '/groups/:id',
    ),
    findByHandle: allpeepNoPayloadEndpoint<GroupWithMeta, { handle: string }>(
        rawClient,
        '/groups/by-handle/:handle',
    ),
    update: allpeepPayloadEndpoint<GroupWithMeta, GroupData, { id: string }>(
        rawClient,
        '/groups/:id',
        'put',
    ),
    delete: allpeepNoPayloadEndpoint<GroupWithMeta, { id: string }>(
        rawClient,
        '/groups/:id',
        'delete',
    ),
    members: allpeepNoPayloadEndpoint<GroupMember[], { id: string }>(
        rawClient,
        '/groups/:id/members',
    ),
    join: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
        rawClient,
        '/groups/:id/join',
        'post',
    ),
    leave: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
        rawClient,
        '/groups/:id/leave',
        'delete',
    ),
    addMember: allpeepPayloadEndpoint<SuccessResponse, PublicProfile, { id: string }>(
        rawClient,
        '/groups/:id/members',
    ),
    removeMember: allpeepNoPayloadEndpoint<SuccessResponse, { id: string; memberId: string }>(
        rawClient,
        '/groups/:id/members/:memberId',
        'delete',
    ),
    setMemberRoles: allpeepPayloadEndpoint<SuccessResponse, GroupRoleData, { id: string; memberId: string }>(
        rawClient,
        '/groups/:id/members/:memberId',
        'put',
    ),
}); 