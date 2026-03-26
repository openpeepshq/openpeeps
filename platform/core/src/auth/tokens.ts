import { Authorization, Identity, Profile, ProfileWithMeta, Scope } from "@openpeeps/common/types";
import { uuidv7 } from "uuidv7";
import { jwtUtil } from "../jwt";

export const createServiceToken = async (
    scopes: Scope[],
): Promise<Authorization> => ({
    identities: [
        {
            type: 'service',
            id: uuidv7(),
        },
    ],
    scopes,
});

export const createGuestPass = (
    profile: ProfileWithMeta,
): Authorization | undefined => profile.guestData?.resource && ({
    identities: [
        {
            type: 'guest-profile',
            id: profile.id,
        },
    ],
    scopes: [
        {
            scope: 'read',
            resource: profile.guestData?.resource,
        },
    ],
});

export const createAuthorization = (
    accountKey: string,
    profileKey?: string,
): Authorization => ({
    identities: [
        {
            type: 'local',
            id: accountKey,
        },
        ...(profileKey
            ? [
                {
                    type: 'current-profile',
                    id: profileKey,
                } as Identity,
            ]
            : []),
    ],
    scopes: profileKey
        ? [
            {
                scope: 'write',
                resource: {
                    type: 'profile',
                    id: profileKey,
                },
            },
        ]
        : [],
});

export const createDbToken = (profile: Profile) =>
    jwtUtil().then((jwt) =>
        jwt.sign(
            {
                identities: [
                    {
                        type: 'current-profile',
                        id: profile.id,
                    },
                ],
                scopes: [
                    {
                        scope: 'admin',
                        resource: {
                            type: 'db',
                            id: uuidv7(),
                        },
                    },
                ],
            },
            '1h',
        ),
    );

export const verifyDbToken = (token: string): Promise<boolean> =>
    jwtUtil()
        .then((jwt) => jwt.verify(token))
        .then((result) => result && (result.payload as Authorization))
        .then(
            (authorization) =>
                !!authorization?.scopes?.find(
                    (s) => s.resource.type === 'db' && s.scope === 'admin',
                ),
        );
