import { Account, FollowData, GuestPassRequest, Profile, ProfileData, Role } from "@openpeeps/common/types";
import { profilesMapping } from "./mapping";
import { allpeepDb } from "../db";
import { followConnector, followDisconnector, giveControl, roleAssigner, roleUnassigner } from "./helpers";
import { hub } from "../events";
import { randomString } from "@openpeeps/common/lib";
import { deleteAccessTokensForProfile } from "../accessTokens/helpers";
import { profilesCache, getProfile } from "./cache";
import { accountsCache } from "../accounts/cache";

export const createProfile = async (data: ProfileData, controllingAccount?: Account) => {
    const db = await allpeepDb().then(db => db.db);
    const profile = await profilesMapping.create(db, data);
    if (controllingAccount) {
        await giveControl(db, controllingAccount, profile);
        await accountsCache.del(controllingAccount.id);
    }
    if (data.type !== "guest") {
        await hub.emit("profileCreated", profile);
    }
    return profile;
}

export const createGuestProfile = async (
    guestPassRequest: GuestPassRequest,
) => createProfile({
    handle: `guest-${randomString(6)}`,
    displayName: guestPassRequest.displayName,
    type: 'guest',
    guestData: {
        email: guestPassRequest.email,
        resource: guestPassRequest.resource,
    },
})

export const updateProfile = async (profileId: string, data: Partial<ProfileData>) => {
    const db = await allpeepDb().then(db => db.db);
    await profilesCache.del(profileId);
    if (data.handle) {
        await profilesCache.del(data.handle);
    }
    return profilesMapping.update(db, profileId, data);
}

export const deleteProfile = async (profileId: string) => {
    const db = await allpeepDb().then(db => db.db);
    const profileToDelete = await getProfile(profileId);
    if (profileToDelete) {
        await Promise.all(profileToDelete.controllers?.map(account => accountsCache.del(account.id)) ?? []);

        if (profileToDelete.following && profileToDelete.following.length > 0) {
            await Promise.all(profileToDelete.following.map(followed =>
                profilesCache.del(followed.id)
            ));
        }

        if (profileToDelete.followers && profileToDelete.followers.length > 0) {
            await Promise.all(profileToDelete.followers.map(follower =>
                profilesCache.del(follower.id)
            ));
        }
    }

    await profilesCache.del(profileId);
    await deleteAccessTokensForProfile(db, profileId);
    return profilesMapping.delete(db, profileId);
}

export const follow = async (follower: Profile, followed: Profile, followData: FollowData) =>
    allpeepDb()
        .then(({ db }) => followConnector(db, follower, followed, followData))
        .then(() => {
            profilesCache.del(follower.id);
            profilesCache.del(followed.id);
        })
        .then(() => hub.emit("followCreated", follower, followed));

export const unfollow = async (follower: Profile, followed: Profile) =>
    allpeepDb()
        .then(({ db }) => followDisconnector(db, follower, followed))
        .then(() => {
            profilesCache.del(follower.id);
            profilesCache.del(followed.id);
        });

export const assignRole = (profile: Profile, role: Role) =>
    allpeepDb().then(({ db }) => roleAssigner(db, profile, role)).then(() => profilesCache.del(profile.id));

export const unassignRole = (profile: Profile, role: Role) =>
    allpeepDb().then(({ db }) => roleUnassigner(db, profile, role)).then(() => profilesCache.del(profile.id));
